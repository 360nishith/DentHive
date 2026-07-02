import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'billing' }),
    BullModule.registerQueue({ name: 'whatsapp' }),
    BullModule.registerQueue({ name: 'whatsapp-webhooks' }),
  ],
  controllers: [WebhookController],
  providers: [PrismaService],
})
export class WebhooksModule {}
