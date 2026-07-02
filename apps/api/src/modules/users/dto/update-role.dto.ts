import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum RoleType {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  FRONT_DESK = 'FRONT_DESK',
}

export class UpdateRoleDto {
  @IsEnum(RoleType)
  @IsNotEmpty()
  role: RoleType;
}
