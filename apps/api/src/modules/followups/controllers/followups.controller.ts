import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { FollowUpsService } from '../services/followups.service';

@Controller('followups')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get('pending')
  async getPending(@Req() req: any) {
    return this.followUpsService.getPendingFollowUps(req.user.tenantId);
  }

  @Get('stalled')
  async getStalled(@Req() req: any, @Query('doctorId') doctorId?: string) {
    return this.followUpsService.getStalledJourneys(req.user.tenantId, doctorId);
  }
}
