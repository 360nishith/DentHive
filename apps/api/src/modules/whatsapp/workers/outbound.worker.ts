import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MetaApiService } from '../services/meta-api.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('whatsapp', {
  skipStalledCheck: true,
  drainDelay: 60000
})
export class OutboundWorker extends WorkerHost {
  private readonly logger = new Logger(OutboundWorker.name);

  constructor(
    private readonly metaApi: MetaApiService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'send-template') {
      const { messageId, to, template, components } = job.data;
      
      try {
        const dbMsg = await this.prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
        if (!dbMsg) {
          this.logger.error(`Message ${messageId} not found in DB`);
          return;
        }

        const response = await this.metaApi.sendTemplateMessage(dbMsg.tenantId, to, template, 'en', components);
        
        // Update DB record with the Meta message ID and status
        await this.prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            payload: {
              ...job.data,
              metaMessageId: response.id
            }
          }
        });

        this.logger.log(`Successfully sent message ${messageId} via Meta API.`);
        return { success: true, metaId: response.id };
      } catch (error: any) {
        this.logger.error(`Failed to send message ${messageId}`, error.message);
        
        // If it's the last attempt, mark as FAILED and save the exact Meta API error for debugging
        if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
          const metaError = error.response?.data || error.message;
          await this.prisma.whatsAppMessage.update({
            where: { id: messageId },
            data: { 
              status: 'FAILED',
              payload: {
                ...job.data,
                metaError
              }
            }
          });
        }
        
        throw error; // Let BullMQ handle retries
      }
    } else if (job.name === 'send-text') {
      const { messageId, to, text } = job.data;
      
      try {
        const dbMsg = await this.prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
        if (!dbMsg) {
          this.logger.error(`Message ${messageId} not found in DB`);
          return;
        }

        const response = await this.metaApi.sendTextMessage(dbMsg.tenantId, to, text);
        
        await this.prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            payload: {
              ...(dbMsg.payload as object),
              ...job.data,
              metaMessageId: response.id
            }
          }
        });

        this.logger.log(`Successfully sent text message ${messageId} via Meta API.`);
        return { success: true, metaId: response.id };
      } catch (error: any) {
        this.logger.error(`Failed to send text message ${messageId}`, error.message);
        
        if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
          await this.prisma.whatsAppMessage.update({
            where: { id: messageId },
            data: { status: 'FAILED' }
          });
        }
        
        throw error;
      }
    }
  }
}
