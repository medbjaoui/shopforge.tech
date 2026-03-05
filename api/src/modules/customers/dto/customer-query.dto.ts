import { IsOptional, IsString } from 'class-validator';

export class CustomerQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsString() segment?: string; // NEW, ACTIVE, VIP, AT_RISK, INACTIVE
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
