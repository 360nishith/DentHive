import { Controller, Post, Get, Patch, Delete, Body, Req, UseGuards, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { AuthGuard } from '@nestjs/passport';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(AuthGuard('jwt-onboarding')) // Allow users without a tenantId to hit this
  async createClinic(@Req() req: any, @Body() body: any) {
    // The user's Supabase UUID is extracted from the JWT
    return this.tenantService.createClinic(req.user.id, body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard) // Must be fully onboarded (have tenantId)
  async getMyClinic(@Req() req: any) {
    return this.tenantService.getMyClinic(req.user.tenantId, req.user.email, req.user.id);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard)
  async updateClinic(@Req() req: any, @Body() body: any) {
    if (req.user.role === 'STAFF') {
      throw new Error('Unauthorized');
    }

    if (req.user.role === 'DENTIST') {
      return this.tenantService.updateClinic(req.user.tenantId, req.user.id, {
        upiVpa: body.upiVpa
      });
    }

    // Admins can update everything
    return this.tenantService.updateClinic(req.user.tenantId, req.user.id, {
      name: body.name,
      upiVpa: body.upiVpa,
      waPhoneNumberId: body.waPhoneNumberId,
      waAccessToken: body.waAccessToken,
      waAppSecret: body.waAppSecret,
      logoUrl: body.logoUrl,
      address: body.address,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      defaultPaperSize: body.defaultPaperSize,
      printConfig: body.printConfig, // This will hold the drag-and-drop JSON data
    });
  }

  @Get('notifications')
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard)
  async getNotifications(@Req() req: any) {
    return this.tenantService.getNotifications(req.user.tenantId, req.user.id, req.user.role);
  }

  @Patch('notifications/read-all')
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard)
  async markNotificationsRead(@Req() req: any) {
    return this.tenantService.markNotificationsRead(req.user.tenantId, req.user.id, req.user.role);
  }

  @Get('export')
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard)
  async exportData(@Req() req: any) {
    if (req.user.role === 'STAFF') {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.tenantService.exportData(req.user.tenantId);
  }

  @Delete('demo-data')
  @UseGuards(AuthGuard('jwt'), TenantStatusGuard)
  async resetDemoData(@Req() req: any) {
    const allowedEmails = ['nishithdharmaraj@gmail.com', 'salesdemo@denthive.in', 'doctordemo@denthive.in'];
    if (!allowedEmails.includes(req.user.email)) {
      throw new UnauthorizedException('Unauthorized. Only the Super Admin can reset demo data.');
    }
    try {
      return await this.tenantService.resetDemoData(req.user.tenantId);
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to wipe data: ' + error.message);
    }
  }
}
