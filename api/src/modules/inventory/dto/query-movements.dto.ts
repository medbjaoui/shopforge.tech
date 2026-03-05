import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class QueryMovementsDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsEnum(StockMovementType) type?: StockMovementType;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
