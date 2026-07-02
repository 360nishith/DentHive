import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { WhatsAppService } from '../services/whatsapp.service';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  async sendManualMessage(@Body() body: any, @Req() req: any) {
    return this.whatsappService.sendMessage(
      req.user.tenantId,
      body.patientId,
      body.to,
      body.template,
      body.components
    );
  }

  @Post('send-payment')
  async sendPaymentLink(@Body() body: any, @Req() req: any) {
    const { patientId, amount, journeyName } = body;
    // Let the service handle looking up the patient and tenant details
    return this.whatsappService.sendPaymentLink(
      req.user.tenantId,
      patientId,
      amount,
      journeyName
    );
  }
}
