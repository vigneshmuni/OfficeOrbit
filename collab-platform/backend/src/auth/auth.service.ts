import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, ProjectRole, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.globalRole };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(dto: any) {
    const normalizedEmail = dto.email?.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new UnauthorizedException('Email is already registered');
    }
    const newUser = await this.usersService.create({ ...dto, email: normalizedEmail });

    // Auto-assign new user to existing default/demo projects so they have projects & tasks immediately
    const existingProjects = await this.prisma.project.findMany();
    if (existingProjects.length > 0) {
      let projRole: ProjectRole = ProjectRole.TEAM_MEMBER;
      if (newUser.globalRole === GlobalRole.PROJECT_MANAGER || newUser.globalRole === GlobalRole.ADMIN) {
        projRole = ProjectRole.PROJECT_MANAGER;
      } else if (newUser.globalRole === GlobalRole.VIEWER) {
        projRole = ProjectRole.VIEWER;
      }

      await this.prisma.projectMember.createMany({
        data: existingProjects.map((p) => ({
          projectId: p.id,
          userId: newUser.id,
          projectRole: projRole,
        })),
        skipDuplicates: true,
      });
    }

    return this.login(newUser);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
