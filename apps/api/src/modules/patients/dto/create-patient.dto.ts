import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsBoolean()
  @IsOptional()
  whatsappOptIn?: boolean;
}
