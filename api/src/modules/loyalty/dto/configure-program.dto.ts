import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class ConfigureProgramDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsPerDinar?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rewardThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  welcomePoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reviewPoints?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  silverThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  goldThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  platinumThreshold?: number;
}
