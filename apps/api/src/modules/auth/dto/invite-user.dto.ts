import { IsEmail, IsNotEmpty, IsString, MaxLength, IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  roleName: string;
}
