import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { JourneysService } from '../services/journeys.service';
import { RevenueService } from '../services/revenue.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

/**
 * Controller for managing individual Patient Treatment Journeys.
 */
@Controller('journeys')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
@UseInterceptors(AuditLoggerInterceptor) // HIPAA Compliance: Log all access to patient journeys
export class JourneysController {
  constructor(
    private readonly journeysService: JourneysService,
    private readonly revenueService: RevenueService
  ) {}

  @Post()
  @RequirePermissions('EDIT_PATIENT')
  async createJourney(@Body() body: any, @Req() req: any) {
    return this.journeysService.createJourney(req.user.tenantId, body);
  }

  @Get()
  async getAllJourneys(@Req() req: any) {
    return this.journeysService.getAllJourneys(req.user.tenantId);
  }

  @Get(':id')
  async getJourneyById(@Param('id') id: string) {
    // return this.journeysService.getJourneyById(id);
    return { id, status: 'fetched' }; // Placeholder for brevity
  }

  @Get('patient/:patientId')
  async getJourneysByPatient(@Param('patientId') patientId: string, @Req() req: any) {
    return this.journeysService.getJourneysByPatient(req.user.tenantId, patientId);
  }

  @Patch(':id')
  @RequirePermissions('EDIT_PATIENT')
  async updateJourney(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (body.status) {
      return this.journeysService.updateJourneyStatus(req.user.tenantId, id, body.status);
    }
    return { id, status: 'updated' }; // Placeholder for brevity
  }

  @Post(':id/advance')
  @RequirePermissions('EDIT_PATIENT')
  async advanceStage(@Param('id') id: string, @Body() body: { currentStageOrder: number }, @Req() req: any) {
    return this.journeysService.advanceStage(req.user.tenantId, id, body.currentStageOrder);
  }

  @Delete(':id')
  @RequirePermissions('EDIT_PATIENT')
  async deleteJourney(@Param('id') id: string, @Req() req: any) {
    return this.journeysService.deleteJourney(req.user.tenantId, id);
  }

  // ---- DYNAMIC STAGE ENDPOINTS ----

  @Post(':id/stages')
  @RequirePermissions('EDIT_PATIENT')
  async addStage(@Param('id') id: string, @Body() body: { name: string; cost: number }, @Req() req: any) {
    return this.journeysService.addStage(req.user.tenantId, id, body);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermissions('EDIT_PATIENT')
  async updateStage(@Param('id') id: string, @Param('stageId') stageId: string, @Body() body: { name?: string; cost?: number }, @Req() req: any) {
    return this.journeysService.updateStage(req.user.tenantId, id, stageId, body);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermissions('EDIT_PATIENT')
  async deleteStage(@Param('id') id: string, @Param('stageId') stageId: string, @Req() req: any) {
    return this.journeysService.deleteStage(req.user.tenantId, id, stageId);
  }

  /**
   * FINANCIAL OVERSIGHT
   * Calculates how much revenue has been collected for this specific journey.
   */
  @Get(':id/revenue')
  @RequirePermissions('VIEW_BILLING') // Requires financial clearance
  async getJourneyRevenue(@Param('id') id: string, @Req() req: any) {
    return this.revenueService.calculateJourneyRevenue(req.user.tenantId, id);
  }
}
