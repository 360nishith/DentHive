import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredTrials() {
    this.logger.log('Running daily expired trial check...');

    // 31 days ago (allow 30 full days)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 31);

    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        status: 'TRIAL',
        subdomain: { not: 'nishith' },
        createdAt: {
          lte: expirationDate
        }
      }
    });

    if (expiredTenants.length > 0) {
      const tenantIds = expiredTenants.map(t => t.id);
      
      await this.prisma.tenant.updateMany({
        where: { id: { in: tenantIds } },
        data: { status: 'READ_ONLY' }
      });

      this.logger.log(`Downgraded ${expiredTenants.length} tenants to READ_ONLY mode (Trial Expired).`);

      for (const t of tenantIds) {
        await this.prisma.notification.create({
          data: {
            tenantId: t,
            title: 'Trial Expired - Read Only Mode',
            message: 'Your 30-day free trial has expired. You can still view your data, but you must subscribe to add new patients or book appointments.',
            type: 'ERROR'
          }
        });
      }
    } else {
      this.logger.log('No expired trials found today.');
    }

    // 2. Check Expired Subscriptions (30 days after payment)
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'HALTED'] },
        tenant: { subdomain: { not: 'nishith' } },
        currentPeriodEnd: { lte: new Date() }
      }
    });

    if (expiredSubscriptions.length > 0) {
      const trulyExpired = [];

      for (const sub of expiredSubscriptions) {
        if (sub.razorpaySubId) {
          try {
            // Self-Heal: Ping Razorpay to double-check if webhook was missed
            const rzpSub = await this.razorpayService['razorpay'].subscriptions.fetch(sub.razorpaySubId);
            const rzpEnd = new Date(rzpSub.current_end * 1000);
            
            if (rzpSub.status === 'active' && rzpEnd > new Date()) {
              // The webhook failed, but they DID pay! Self-heal the database.
              await this.prisma.subscription.update({
                where: { id: sub.id },
                data: { currentPeriodEnd: rzpEnd, cancelAtPeriodEnd: false }
              });
              this.logger.log(`Self-healed missing webhook for subscription ${sub.id}`);
              continue; // Skip the downgrade!
            }
          } catch (e) {
            this.logger.error(`Failed to verify subscription ${sub.razorpaySubId} with Razorpay`, e);
          }
        }
        trulyExpired.push(sub);
      }

      if (trulyExpired.length > 0) {
        const tenantIds = trulyExpired.map(s => s.tenantId);
        const subIds = trulyExpired.map(s => s.id);

        await this.prisma.tenant.updateMany({
          where: { id: { in: tenantIds } },
          data: { status: 'READ_ONLY' }
        });

        await this.prisma.subscription.updateMany({
          where: { id: { in: subIds } },
          data: { status: 'PAST_DUE' }
        });

        this.logger.log(`Downgraded ${trulyExpired.length} tenants to READ_ONLY mode (Subscription Expired).`);

        for (const t of tenantIds) {
          await this.prisma.notification.create({
            data: {
              tenantId: t,
              title: 'Subscription Expired - Read Only Mode',
              message: 'Your monthly subscription has expired. Please renew your plan to restore full access.',
              type: 'ERROR'
            }
          });
        }
      }
    }
  }
}
