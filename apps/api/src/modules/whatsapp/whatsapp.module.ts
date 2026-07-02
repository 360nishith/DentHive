import { Module } from '@nestjs/common';
import { WhatsAppController } from './controllers/whatsapp.controller';
import { WhatsAppService } from './services/whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import { BullModule } from '@nestjs/bullmq';

import { MetaApiService } from './services/meta-api.service';
import { OutboundWorker } from './workers/outbound.worker';
import { WebhookWorker } from './workers/webhook.worker';
import { WhatsAppListenerService } from './services/whatsapp-listener.service';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({ name: 'whatsapp' }),
    BullModule.registerQueue({ name: 'whatsapp-webhooks' }),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService, 
    PrismaService, 
    MetaApiService, 
    OutboundWorker,
    WebhookWorker,
    WhatsAppListenerService
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
