import { IsString, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';
import { CustomerSource } from '@prisma/client';

export class CreateCustomerDto {
  @IsString() @MinLength(1)
  firstName: string;

  @IsString() @MinLength(1)
  lastName: string;

  @IsString()
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  matriculeFiscal?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;
}
