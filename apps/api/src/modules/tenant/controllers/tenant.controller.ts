import { Controller, Post, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { AuthGuard } from '@nestjs/passport';

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
  @UseGuards(AuthGuard('jwt')) // Must be fully onboarded (have tenantId)
  async getMyClinic(@Req() req: any) {
    return this.tenantService.getMyClinic(req.user.tenantId, req.user.email, req.user.id);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
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
      waAppSecret: body.waAppSecret
    });
  }

  @Get('notifications')
  @UseGuards(AuthGuard('jwt'))
  async getNotifications(@Req() req: any) {
    return this.tenantService.getNotifications(req.user.tenantId, req.user.id, req.user.role);
  }

  @Patch('notifications/read-all')
  @UseGuards(AuthGuard('jwt'))
  async markNotificationsRead(@Req() req: any) {
    return this.tenantService.markNotificationsRead(req.user.tenantId, req.user.id, req.user.role);
  }

  @Get('export')
  @UseGuards(AuthGuard('jwt'))
  async exportData(@Req() req: any) {
    if (req.user.role === 'STAFF') {
      throw new Error('Unauthorized');
    }
    return this.tenantService.exportData(req.user.tenantId);
  }

  @Delete('demo-data')
  @UseGuards(AuthGuard('jwt'))
  async resetDemoData(@Req() req: any) {
    const allowedEmails = ['nishithdharmaraj@gmail.com', 'salesdemo@denthive.in', 'doctordemo@denthive.in'];
    if (!allowedEmails.includes(req.user.email)) {
      throw new Error('Unauthorized. Only the Super Admin can reset demo data.');
    }
    return this.tenantService.resetDemoData(req.user.tenantId);
  }
}
