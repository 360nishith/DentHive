import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AppointmentsService } from '../services/appointments.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions('CREATE_APPOINTMENT')
  async createAppointment(@Body() body: any, @Req() req: any) {
    return this.appointmentsService.createAppointment(req.user.tenantId, body);
  }

  @Get()
  @RequirePermissions('VIEW_CALENDAR')
  async getCalendar(@Req() req: any, @Query('start') start: string, @Query('end') end: string, @Query('doctorId') doctorId?: string) {
    return this.appointmentsService.getCalendar(req.user.tenantId, start, end, doctorId);
  }

  @Get('patient/:patientId')
  async getPatientAppointments(@Req() req: any, @Param('patientId') patientId: string) {
    return this.appointmentsService.getPatientAppointments(req.user.tenantId, patientId);
  }

  @Patch(':id')
  async updateAppointment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.appointmentsService.updateAppointment(req.user.tenantId, id, body);
  }

  @Post(':id/test-reminder')
  async testReminder(@Req() req: any, @Param('id') id: string) {
    return this.appointmentsService.testFireReminder(req.user.tenantId, id);
  }
}
