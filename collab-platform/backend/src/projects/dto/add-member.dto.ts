import { IsString, IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  projectRole: ProjectRole;
}
