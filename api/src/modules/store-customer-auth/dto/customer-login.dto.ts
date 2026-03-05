import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CustomerLoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() @IsString() password: string;
}
