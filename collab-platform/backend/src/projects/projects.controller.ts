import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GlobalRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Roles(GlobalRole.ADMIN, GlobalRole.PROJECT_MANAGER)
  @Post()
  create(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(dto, req.user.userId);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.projectsService.findAll(req.user.userId, req.user.globalRole, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user.userId, req.user.globalRole);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Request() req: any) {
    return this.projectsService.update(id, dto, req.user.userId, req.user.globalRole);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.archive(id, req.user.userId, req.user.globalRole);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.delete(id, req.user.userId, req.user.globalRole);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @Request() req: any) {
    return this.projectsService.addMember(id, dto, req.user.userId, req.user.globalRole);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    return this.projectsService.removeMember(id, userId, req.user.userId, req.user.globalRole);
  }

  @Get(':id/activity')
  getActivity(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.projectsService.getActivity(id, req.user.userId, req.user.globalRole, page, limit);
  }
}
