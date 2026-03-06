import { IsInt, IsString, IsOptional } from 'class-validator';

export class AdjustPointsDto {
  @IsInt()
  points: number; // Positif = ajouter, Négatif = retirer

  @IsOptional()
  @IsString()
  description?: string;
}
