import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  constructor(private readonly prisma: PrismaService) {}

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
  }

  async sendTemplateMessage(tenantId: string, to: string, templateName: string, languageCode: string = 'en_US', components: any[] = []) {
    const formattedTo = this.formatPhone(to);
    let finalPhoneId = this.phoneNumberId;
    let finalToken = this.accessToken;

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.waPhoneNumberId && tenant?.waAccessToken) {
        finalPhoneId = tenant.waPhoneNumberId;
        finalToken = tenant.waAccessToken;
      }
    }

    if (!finalPhoneId || !finalToken) {
      this.logger.warn('WhatsApp credentials not configured, skipping actual API call.');
      return { id: `mock-wa-id-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${finalPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components
          }
        },
        {
          headers: {
            Authorization: `Bearer ${finalToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.messages[0]; // Returns { id: "wamid.HBg..." }
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message to ${to}`, error.response?.data || error.message);
      throw error;
    }
  }

  async sendTextMessage(tenantId: string, to: string, text: string) {
    const formattedTo = this.formatPhone(to);
    let finalPhoneId = this.phoneNumberId;
    let finalToken = this.accessToken;

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.waPhoneNumberId && tenant?.waAccessToken) {
        finalPhoneId = tenant.waPhoneNumberId;
        finalToken = tenant.waAccessToken;
      }
    }

    if (!finalPhoneId || !finalToken) {
      this.logger.warn('WhatsApp credentials not configured, skipping actual API call.');
      return { id: `mock-wa-id-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${finalPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: {
            preview_url: true,
            body: text
          }
        },
        {
          headers: {
            Authorization: `Bearer ${finalToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.messages[0];
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp text to ${to}`, error.response?.data || error.message);
      throw error;
    }
  }
}
