import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalRole, ProjectRole } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
    private projectsService: ProjectsService,
  ) {}

  async create(taskId: string, dto: CreateCommentDto, userId: string, globalRole: GlobalRole) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (globalRole !== GlobalRole.ADMIN) {
      const role = await this.projectsService.getUserProjectRole(task.projectId, userId);
      if (!role || role === ProjectRole.VIEWER) {
        throw new ForbiddenException('Viewers cannot add comments');
      }
    }

    const comment = await this.prisma.comment.create({
      data: { taskId, authorId: userId, content: dto.content },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.activityService.log({
      userId,
      projectId: task.projectId,
      action: 'comment_added',
      entityType: 'comment',
      entityId: comment.id,
      metadata: { taskId, taskTitle: task.title },
    });

    // Notify task assignee if they're not the commenter
    if (task.assigneeId && task.assigneeId !== userId) {
      await this.notificationsService.create({
        userId: task.assigneeId,
        type: 'TASK_COMMENT',
        title: 'New comment on your task',
        message: `Comment on: ${task.title}`,
        projectId: task.projectId,
        taskId,
      });
      this.gateway.emitToUser(task.assigneeId, 'notification:new', {
        type: 'TASK_COMMENT',
        taskId,
      });
    }

    this.gateway.emitToProject(task.projectId, 'comment:created', {
      ...comment,
      taskId,
    });
    return comment;
  }

  async delete(id: string, userId: string, globalRole: GlobalRole) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    // Only the author or admin can delete
    if (globalRole !== GlobalRole.ADMIN && comment.authorId !== userId) {
      // Project managers can also delete
      const role = await this.projectsService.getUserProjectRole(comment.task.projectId, userId);
      if (role !== ProjectRole.PROJECT_MANAGER) {
        throw new ForbiddenException('Cannot delete this comment');
      }
    }

    await this.prisma.comment.delete({ where: { id } });
    this.gateway.emitToProject(comment.task.projectId, 'comment:deleted', {
      id,
      taskId: comment.taskId,
    });
    return { success: true };
  }
}
