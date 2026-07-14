import { IsUUID, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum JourneyStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateJourneyDto {
  @IsUUID('4')
  @IsNotEmpty()
  patientId: string;

  @IsUUID('4')
  @IsOptional()
  doctorId?: string;

  @IsUUID('4')
  @IsNotEmpty()
  templateId: string;

  @IsEnum(JourneyStatus)
  @IsOptional()
  status?: JourneyStatus;
}
