import { Controller, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  create(@Param('taskId') taskId: string, @Body() dto: CreateCommentDto, @Request() req: any) {
    return this.commentsService.create(taskId, dto, req.user.userId, req.user.globalRole);
  }

  @Delete('comments/:id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.commentsService.delete(id, req.user.userId, req.user.globalRole);
  }
}
