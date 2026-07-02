import { Controller, Post, Patch, Body, UseGuards, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invite')
  @RequirePermissions('CREATE_USER')
  async inviteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inviteDto: InviteUserDto & { password?: string },
  ) {
    return this.authService.createStaff(user.tenantId, inviteDto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('CREATE_USER')
  async deactivateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.authService.deactivateStaff(user.tenantId, userId, dto);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
