import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
