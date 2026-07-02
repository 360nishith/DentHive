import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
