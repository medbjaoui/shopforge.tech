import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Fallback pour dev local sans subdomain Nginx
  // En production, le tenant vient du header X-Tenant-Slug (Nginx)
  @IsOptional()
  @IsString()
  storeSlug?: string;
}
