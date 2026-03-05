import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractere special (!@#$%^&*)',
  })
  newPassword: string;
}
