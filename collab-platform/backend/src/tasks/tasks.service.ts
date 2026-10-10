import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GlobalRole, ProjectRole, TaskStatus } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
    private projectsService: ProjectsService,
  ) {}

  private async assertCanManageTasks(projectId: string, userId: string, globalRole: GlobalRole) {
    if (globalRole === GlobalRole.ADMIN) return;
    const role = await this.projectsService.getUserProjectRole(projectId, userId);
    if (!role) throw new ForbiddenException('Not a project member');
    if (role === ProjectRole.VIEWER) throw new ForbiddenException('Viewers cannot manage tasks');
  }

  private async assertIsAssigneeOrManager(
    task: any,
    userId: string,
    globalRole: GlobalRole,
  ) {
    if (globalRole === GlobalRole.ADMIN) return;
    const role = await this.projectsService.getUserProjectRole(task.projectId, userId);
    if (!role) throw new ForbiddenException('Not a project member');
    if (role === ProjectRole.VIEWER) throw new ForbiddenException('Viewers cannot edit tasks');
  }

  async create(dto: CreateTaskDto, userId: string, globalRole: GlobalRole) {
    await this.assertCanManageTasks(dto.projectId, userId, globalRole);
    const role = await this.projectsService.getUserProjectRole(dto.projectId, userId);
    if (role === ProjectRole.TEAM_MEMBER && dto.assigneeId && dto.assigneeId !== userId) {
      throw new ForbiddenException('Team members can only assign tasks to themselves');
    }

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        creatorId: userId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await this.activityService.log({
      userId,
      projectId: dto.projectId,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      metadata: { title: task.title },
    });

    if (dto.assigneeId) {
      await this.notificationsService.create({
        userId: dto.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: `You have been assigned: ${task.title}`,
        projectId: dto.projectId,
        taskId: task.id,
      });
      this.gateway.emitToUser(dto.assigneeId, 'notification:new', {
        type: 'TASK_ASSIGNED',
        taskId: task.id,
        title: 'Task assigned to you',
        message: `You have been assigned: ${task.title}`,
        projectId: dto.projectId,
      });
    }

    this.gateway.emitToProject(dto.projectId, 'task:created', task);
    return task;
  }

  async findAll(
    projectId: string,
    userId: string,
    globalRole: GlobalRole,
    filters: { status?: TaskStatus; assigneeId?: string; page?: number; limit?: number },
  ) {
    const { status, assigneeId, page = 1, limit = 50 } = filters;
    if (globalRole !== GlobalRole.ADMIN) {
      const role = await this.projectsService.getUserProjectRole(projectId, userId);
      if (!role) throw new ForbiddenException('Not a project member');
    }

    const where: any = { projectId };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          creator: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);
    return { tasks, total, page, limit };
  }

  async findOne(id: string, userId: string, globalRole: GlobalRole) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, email: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (globalRole !== GlobalRole.ADMIN) {
      const role = await this.projectsService.getUserProjectRole(task.projectId, userId);
      if (!role) throw new ForbiddenException('Not a project member');
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, globalRole: GlobalRole) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    await this.assertIsAssigneeOrManager(task, userId, globalRole);

    // ── Optimistic Concurrency Control ──
    if (dto.version !== undefined && dto.version !== task.version) {
      throw new ConflictException({
        message: 'Conflict: this task has been modified by another user.',
        currentVersion: task.version,
        yourVersion: dto.version,
      });
    }

    const prevStatus = task.status;
    const prevAssigneeId = task.assigneeId;

    const { version: _v, ...updateData } = dto;
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Activity & notifications
    if (dto.status && dto.status !== prevStatus) {
      await this.activityService.log({
        userId,
        projectId: task.projectId,
        action: 'task_status_changed',
        entityType: 'task',
        entityId: id,
        metadata: { from: prevStatus, to: dto.status, title: task.title },
      });

      // Notify assignee of status change
      if (task.assigneeId && task.assigneeId !== userId) {
        await this.notificationsService.create({
          userId: task.assigneeId,
          type: 'TASK_STATUS_CHANGED',
          title: 'Task status updated',
          message: `${task.title} changed to ${dto.status}`,
          projectId: task.projectId,
          taskId: id,
        });
        this.gateway.emitToUser(task.assigneeId, 'notification:new', {
          type: 'TASK_STATUS_CHANGED',
          taskId: id,
        });
      }
    }

    if (dto.assigneeId && dto.assigneeId !== prevAssigneeId) {
      await this.activityService.log({
        userId,
        projectId: task.projectId,
        action: 'task_assigned',
        entityType: 'task',
        entityId: id,
        metadata: { assigneeId: dto.assigneeId, title: task.title },
      });

      await this.notificationsService.create({
        userId: dto.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: `You have been assigned: ${task.title}`,
        projectId: task.projectId,
        taskId: id,
      });
      this.gateway.emitToUser(dto.assigneeId, 'notification:new', {
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: `You have been assigned: ${task.title}`,
        projectId: task.projectId,
        taskId: id,
      });
    } else {
      await this.activityService.log({
        userId,
        projectId: task.projectId,
        action: 'task_updated',
        entityType: 'task',
        entityId: id,
        metadata: { title: task.title },
      });
    }

    this.gateway.emitToProject(task.projectId, 'task:updated', updated);
    return updated;
  }

  async delete(id: string, userId: string, globalRole: GlobalRole) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    if (globalRole !== GlobalRole.ADMIN) {
      const role = await this.projectsService.getUserProjectRole(task.projectId, userId);
      if (!role || role !== ProjectRole.PROJECT_MANAGER) {
        throw new ForbiddenException('Only project managers can delete tasks');
      }
    }

    await this.prisma.task.delete({ where: { id } });
    await this.activityService.log({
      userId,
      projectId: task.projectId,
      action: 'task_deleted',
      entityType: 'task',
      entityId: id,
      metadata: { title: task.title },
    });

    this.gateway.emitToProject(task.projectId, 'task:deleted', { id, projectId: task.projectId });
    return { success: true };
  }
}
