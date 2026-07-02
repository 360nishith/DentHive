import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TemplatesService } from '../services/templates.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

/**
 * Controller for Treatment Journey Templates.
 * Only CLINIC_ADMINS (or users with EDIT_CLINIC) can modify templates.
 */
@Controller('journey-templates')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @RequirePermissions('EDIT_CLINIC')
  async createTemplate(@Body() body: any, @Req() req: any) {
    // In production, body should be validated with class-validator DTOs
    return this.templatesService.createTemplate(req.user.tenantId, body);
  }

  @Get()
  async getTemplates(@Req() req: any) {
    // Read operations might not strictly require permissions beyond general auth
    return this.templatesService.getTemplates(req.user.tenantId);
  }

  @Get(':id')
  async getTemplateById(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.getTemplateById(req.user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('EDIT_CLINIC')
  async updateTemplate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.templatesService.updateTemplate(req.user.tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('EDIT_CLINIC')
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.deleteTemplate(req.user.tenantId, id);
  }

  @Post('seed/default')
  @RequirePermissions('EDIT_CLINIC')
  async seedDefaultTemplates(@Req() req: any) {
    // A quick utility to seed default templates for the clinic to test Phase 3 easily
    const tenantId = req.user.tenantId;
    return this.templatesService.seedTemplates(tenantId);
  }
}
