import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class OnboardTenantDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  clinicName!: string;

  @IsString()
  @IsNotEmpty()
  captchaToken!: string;
}
