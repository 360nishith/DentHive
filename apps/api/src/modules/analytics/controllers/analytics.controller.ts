import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('VIEW_BILLING') // Only admins see analytics
  async getDashboard(@Req() req: any, @Query('start') start: string, @Query('end') end: string) {
    return this.analyticsService.getDashboardMetrics(req.user.tenantId, new Date(start), new Date(end));
  }
}
