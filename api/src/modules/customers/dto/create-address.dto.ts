import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { GOVERNORATES } from '../constants/governorates';

export class CreateAddressDto {
  @IsOptional() @IsString()
  label?: string;

  @IsString()
  line1: string;

  @IsOptional() @IsString()
  line2?: string;

  @IsString()
  city: string;

  @IsString()
  @IsIn([...GOVERNORATES], { message: 'Gouvernorat invalide' })
  governorate: string;

  @IsOptional() @IsString()
  postalCode?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}
