import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { MedicinesService } from '../services/medicines.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('medicines')
@UseGuards(AuthGuard('jwt'))
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Post()
  create(@Req() req: any, @Body() createMedicineDto: any) {
    if (req.user.role === 'STAFF') {
      throw new Error('Staff cannot create a doctor\'s personal medicine template');
    }
    return this.medicinesService.createMedicine(req.user.tenantId, req.user.id, createMedicineDto);
  }

  @Get()
  findAll(@Req() req: any, @Query('doctorId') doctorId?: string) {
    // If staff is querying, they might pass doctorId to see a specific doctor's list
    // If a doctor is querying without a doctorId, we default to their own list
    let targetDoctorId = doctorId;
    if (req.user.role === 'DENTIST' && !doctorId) {
      targetDoctorId = req.user.id;
    }
    
    return this.medicinesService.getMedicines(req.user.tenantId, targetDoctorId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateMedicineDto: any) {
    if (req.user.role === 'STAFF') {
      throw new Error('Staff cannot edit a doctor\'s personal medicine template');
    }
    return this.medicinesService.updateMedicine(req.user.tenantId, req.user.id, id, updateMedicineDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    if (req.user.role === 'STAFF') {
      throw new Error('Staff cannot delete a doctor\'s personal medicine template');
    }
    return this.medicinesService.deleteMedicine(req.user.tenantId, req.user.id, id);
  }
}
