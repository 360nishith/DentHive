import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

@Controller('patients')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @RequirePermissions('CREATE_PATIENT')
  async createPatient(@Body() body: any, @Req() req: any) {
    if (req.user.role !== 'STAFF') {
      if (body.doctorId !== 'UNASSIGNED') {
        body.doctorId = req.user.id;
      } else {
        body.doctorId = null;
      }
    } else {
      if (body.doctorId === 'UNASSIGNED') body.doctorId = null;
    }
    return this.patientsService.create(req.user.tenantId, body);
  }

  @Get()
  async getPatients(@Query() query: any, @Req() req: any) {
    if (query.doctorId === 'MY_PATIENTS') {
      query.doctorId = req.user.id;
    }
    return this.patientsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async getPatientById(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('EDIT_PATIENT')
  async updatePatient(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (req.user.role !== 'STAFF') {
      if (body.doctorId && body.doctorId !== 'UNASSIGNED' && body.doctorId !== req.user.id) {
         throw new Error('You can only assign patients to yourself or Unassigned');
      }
      if (body.doctorId === 'UNASSIGNED') body.doctorId = null;
    } else {
      if (body.doctorId === 'UNASSIGNED') body.doctorId = null;
    }
    return this.patientsService.update(req.user.tenantId, id, body);
  }

  @Post(':id/archive')
  @RequirePermissions('EDIT_PATIENT')
  async archivePatient(@Param('id') id: string, @Req() req: any) {
    return this.patientsService.archive(req.user.tenantId, id);
  }
}
