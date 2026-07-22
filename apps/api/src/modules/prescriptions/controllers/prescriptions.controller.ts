import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PrescriptionsService } from '../services/prescriptions.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'))
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  create(@Req() req: any, @Body() createPrescriptionDto: any) {
    // Both doctors and staff can create prescriptions (e.g., staff drafts it for the doctor)
    // We assume the frontend passes the correct doctorId if staff is creating it, or we use req.user.id if it's a dentist.
    const doctorId = createPrescriptionDto.doctorId || req.user.id;
    
    if (!doctorId) {
      throw new Error('A doctor ID is required to create a prescription.');
    }

    return this.prescriptionsService.createPrescription(req.user.tenantId, doctorId, createPrescriptionDto);
  }

  @Get('patient/:patientId')
  findByPatient(@Req() req: any, @Param('patientId') patientId: string) {
    return this.prescriptionsService.getPrescriptionsByPatient(req.user.tenantId, patientId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.prescriptionsService.getPrescriptionById(req.user.tenantId, id);
  }
}
