import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: 'ACTIVE' | 'INACTIVE';
}
