import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { GlobalRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: GlobalRole, required: false })
  @IsEnum(GlobalRole)
  @IsOptional()
  globalRole?: GlobalRole;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
