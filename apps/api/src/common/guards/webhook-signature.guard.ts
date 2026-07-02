import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // GET requests are Meta's webhook verification handshake pings.
    // They have no body or signature — allow them through immediately.
    if (req.method === 'GET') return true;

    const rawBody = req.rawBody; // Extracted by RawBodyMiddleware
    
    if (!rawBody) throw new UnauthorizedException('Missing raw payload');

    const isRazorpay = req.path.includes('razorpay');
    let secret = isRazorpay ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.WHATSAPP_APP_SECRET;

    if (!isRazorpay) {
      // Dynamic WhatsApp Webhook signature check for BYOS
      const tenantId = req.query.tenantId;
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.waAppSecret) {
          secret = tenant.waAppSecret;
        }
      }
    }

    const headerKey = isRazorpay ? 'x-razorpay-signature' : 'x-hub-signature-256';
    
    const inboundSignature = req.headers[headerKey];
    if (!inboundSignature || !secret) throw new UnauthorizedException('Missing signature or secret');

    let computedHash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!isRazorpay) computedHash = `sha256=${computedHash}`;

    const isValid = crypto.timingSafeEqual(
      Buffer.from(inboundSignature),
      Buffer.from(computedHash)
    );

    if (!isValid) throw new UnauthorizedException('Invalid cryptographic signature');

    // ONLY parse JSON after verifying the HMAC to prevent JSON parser DoS
    req.body = JSON.parse(rawBody.toString('utf8'));

    return true;
  }
}
