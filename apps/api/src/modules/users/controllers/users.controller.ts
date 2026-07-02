import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'), TenantStatusGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listStaff(@Req() req: any) {
    return this.usersService.listStaff(req.user.tenantId);
  }

  @Patch(':id/role')
  @RequirePermissions('CREATE_USER') // Only Admins can change roles
  async updateRole(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.usersService.updateRole(req.user.tenantId, id, body.role);
  }

  @Delete(':id')
  @RequirePermissions('CREATE_USER')
  async deactivateUser(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deactivateUser(req.user.tenantId, id);
  }
}
