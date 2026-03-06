import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsNotEmpty() @IsString() line1: string;
  @IsOptional() @IsString() line2?: string;
  @IsNotEmpty() @IsString() city: string;
  @IsNotEmpty() @IsString() governorate: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
