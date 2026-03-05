import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

export class AdjustStockDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number; // Positif = ajout, négatif = retrait

  @IsEnum(StockMovementType)
  type: StockMovementType; // ADJUSTMENT, DAMAGE, PURCHASE, INITIAL

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  costPrice?: number;
}
