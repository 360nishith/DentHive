import { Controller, Post, Patch, Delete, Param, Body, UseGuards, Req, Get } from '@nestjs/common';
import { StagesService } from '../services/stages.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

/**
 * Controller for modifying stages within an active patient journey.
 */
@Controller()
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Post('journeys/:id/stages')
  @RequirePermissions('EDIT_PATIENT')
  async createStage(@Param('id') journeyId: string, @Body() body: any, @Req() req: any) {
    return this.stagesService.createStage(req.user.tenantId, journeyId, body);
  }

  @Patch('stages/:id')
  @RequirePermissions('EDIT_PATIENT')
  async updateStage(@Param('id') id: string, @Body() body: any) {
    return this.stagesService.updateStage(id, body);
  }

  @Delete('stages/:id')
  @RequirePermissions('EDIT_PATIENT')
  async deleteStage(@Param('id') id: string) {
    return this.stagesService.deleteStage(id);
  }

  @Post('stages/:id/images')
  @RequirePermissions('EDIT_PATIENT')
  async addImage(@Param('id') stageId: string, @Body('imageUrl') imageUrl: string, @Req() req: any) {
    return this.stagesService.addImage(req.user.tenantId, stageId, imageUrl);
  }

  @Get('stages/:id/images')
  @RequirePermissions('EDIT_PATIENT')
  async getImages(@Param('id') stageId: string, @Req() req: any) {
    return this.stagesService.getImages(req.user.tenantId, stageId);
  }
}
