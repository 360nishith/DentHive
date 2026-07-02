import { IsUUID, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID('4')
  @IsNotEmpty()
  patientId: string;

  @IsUUID('4')
  @IsNotEmpty()
  doctorId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
