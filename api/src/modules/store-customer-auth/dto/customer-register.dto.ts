import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class CustomerRegisterDto {
  @IsNotEmpty() @IsString() firstName: string;
  @IsNotEmpty() @IsString() lastName: string;
  @IsEmail() email: string;
  @IsNotEmpty() @MinLength(6) password: string;
  @IsOptional() @IsString() phone?: string;
}
