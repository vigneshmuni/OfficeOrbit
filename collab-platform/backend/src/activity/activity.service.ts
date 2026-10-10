import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogActivityDto {
  userId: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(dto: LogActivityDto) {
    // Only link taskId for activity logs when entity is a task
    const data: any = {
      userId: dto.userId,
      projectId: dto.projectId,
      action: dto.action,
      entityType: dto.entityType,
      entityId: dto.entityId,
      metadata: dto.metadata,
    };

    try {
      return await this.prisma.activityLog.create({ data });
    } catch (e) {
      // Don't crash the main operation if activity logging fails
      console.error('Activity log failed:', (e as any)?.message);
    }
  }
}
