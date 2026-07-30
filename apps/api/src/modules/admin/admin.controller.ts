import { Controller, Get, Delete, Param, UseGuards, Post, UseInterceptors, UploadedFile, BadRequestException, Body, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('tenants')
  async getTenants() {
    return this.adminService.getTenants();
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  @Patch('tenants/:id/billing')
  async overrideBilling(@Param('id') id: string, @Body() body: { status: string, daysToAdd: number }) {
    return this.adminService.overrideBilling(id, body.status, body.daysToAdd || 0);
  }

  @Post('tenants/:id/import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No CSV file uploaded');
    }
    return this.adminService.importCsv(id, file.buffer);
  }

  @Post('tenants/invite')
  async inviteClient(@Body() body: any) {
    return this.adminService.inviteClient(body);
  }
}
