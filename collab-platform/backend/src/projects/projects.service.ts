import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { GlobalRole, ProjectRole, ProjectStatus } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
  ) {}

  private async assertProjectAccess(projectId: string, userId: string, globalRole: GlobalRole) {
    if (globalRole === GlobalRole.ADMIN) return null;
    let member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const projRole = user?.globalRole === GlobalRole.VIEWER ? ProjectRole.VIEWER : ProjectRole.TEAM_MEMBER;
      member = await this.prisma.projectMember.create({
        data: { projectId, userId, projectRole: projRole },
      });
    }
    return member;
  }

  async create(dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        members: {
          create: {
            userId,
            projectRole: ProjectRole.PROJECT_MANAGER,
          },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    const creator = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.activityService.log({
      userId,
      projectId: project.id,
      action: 'project_created',
      entityType: 'project',
      entityId: project.id,
      metadata: { name: project.name },
    });

    // Notify all users in the system about the new project
    const allUsers = await this.prisma.user.findMany();

    for (const u of allUsers) {
      await this.notificationsService.create({
        userId: u.id,
        type: 'PROJECT_UPDATED',
        title: 'New Project Created',
        message: `${creator?.name || 'A user'} created project "${project.name}"`,
        projectId: project.id,
      });

      this.gateway.emitToUser(u.id, 'notification:new', {
        type: 'PROJECT_CREATED',
        title: 'New Project Created',
        message: `${creator?.name || 'A user'} created project "${project.name}"`,
        projectId: project.id,
      });
    }

    this.gateway.emitToAll('project:created', project);
    this.gateway.emitToProject(project.id, 'project:created', project);
    return project;
  }

  async findAll(userId: string, globalRole: GlobalRole, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {}; // Show all workspace projects so none disappear for users

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { tasks: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            take: 5,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { projects, total, page, limit };
  }

  async findOne(id: string, userId: string, globalRole: GlobalRole) {
    await this.assertProjectAccess(id, userId, globalRole);
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, globalRole: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string, globalRole: GlobalRole) {
    const member = await this.assertProjectAccess(id, userId, globalRole);
    if (
      globalRole !== GlobalRole.ADMIN &&
      member?.projectRole !== ProjectRole.PROJECT_MANAGER
    ) {
      throw new ForbiddenException('Only project managers can update projects');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: dto,
    });

    await this.activityService.log({
      userId,
      projectId: id,
      action: 'project_updated',
      entityType: 'project',
      entityId: id,
      metadata: dto,
    });

    this.gateway.emitToProject(id, 'project:updated', project);
    return project;
  }

  async archive(id: string, userId: string, globalRole: GlobalRole) {
    if (globalRole !== GlobalRole.ADMIN) {
      const member = await this.assertProjectAccess(id, userId, globalRole);
      if (member?.projectRole !== ProjectRole.PROJECT_MANAGER) {
        throw new ForbiddenException('Only project managers or admins can archive');
      }
    }
    const project = await this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
    });
    this.gateway.emitToProject(id, 'project:archived', { id });
    return project;
  }

  async addMember(projectId: string, dto: AddMemberDto, requesterId: string, globalRole: GlobalRole) {
    const member = await this.assertProjectAccess(projectId, requesterId, globalRole);
    if (
      globalRole !== GlobalRole.ADMIN &&
      member?.projectRole !== ProjectRole.PROJECT_MANAGER
    ) {
      throw new ForbiddenException('Only project managers can add members');
    }

    const newMember = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      create: { projectId, userId: dto.userId, projectRole: dto.projectRole },
      update: { projectRole: dto.projectRole },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await this.activityService.log({
      userId: requesterId,
      projectId,
      action: 'member_added',
      entityType: 'project_member',
      entityId: dto.userId,
      metadata: { projectRole: dto.projectRole },
    });

    const targetProject = await this.prisma.project.findUnique({ where: { id: projectId } });
    await this.notificationsService.create({
      userId: dto.userId,
      type: 'PROJECT_MEMBER_ADDED',
      title: 'Added to Project',
      message: `You have been added to project "${targetProject?.name || 'Workspace Project'}"`,
      projectId,
    });

    this.gateway.emitToProject(projectId, 'project:member-added', newMember);
    this.gateway.emitToUser(dto.userId, 'notification:new', {
      type: 'PROJECT_MEMBER_ADDED',
      title: 'Added to Project',
      message: `You have been added to project "${targetProject?.name || 'Workspace Project'}"`,
      projectId,
    });
    return newMember;
  }

  async removeMember(projectId: string, targetUserId: string, requesterId: string, globalRole: GlobalRole) {
    const member = await this.assertProjectAccess(projectId, requesterId, globalRole);
    if (
      globalRole !== GlobalRole.ADMIN &&
      member?.projectRole !== ProjectRole.PROJECT_MANAGER
    ) {
      throw new ForbiddenException('Only project managers can remove members');
    }

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    await this.activityService.log({
      userId: requesterId,
      projectId,
      action: 'member_removed',
      entityType: 'project_member',
      entityId: targetUserId,
    });

    this.gateway.emitToProject(projectId, 'project:member-removed', { userId: targetUserId });
    return { success: true };
  }

  async getActivity(projectId: string, userId: string, globalRole: GlobalRole, page = 1, limit = 30) {
    await this.assertProjectAccess(projectId, userId, globalRole);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { projectId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { projectId } }),
    ]);
    return { logs, total, page, limit };
  }

  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return member?.projectRole ?? null;
  }
}
