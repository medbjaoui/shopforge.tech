import { IsString, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';
import { CustomerStatus } from '@prisma/client';

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1)
  firstName?: string;

  @IsOptional() @IsString() @MinLength(1)
  lastName?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  matriculeFiscal?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
