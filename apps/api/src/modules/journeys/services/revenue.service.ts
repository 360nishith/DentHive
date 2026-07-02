import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Specialized service for calculating financial data mapped to clinical workflows.
 */
@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the total amount billed and collected for a specific journey.
   */
  async calculateJourneyRevenue(tenantId: string, journeyId: string) {
    // 1. Verify journey exists
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id: journeyId, tenantId }
    });

    if (!journey) throw new NotFoundException('Journey not found');

    // 2. Fetch all payments linked to this journey
    const payments = await this.prisma.payment.findMany({
      where: { journeyId }
    });

    // 3. Application-side reduction (Safest for multi-tenant, avoids complex SQL grouping)
    const totalBilled = payments.reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);
    const totalCollected = payments
      .filter((pay: any) => pay.status === 'SUCCESS') // Schema comment for Payment status: PENDING, SUCCESS, FAILED, REFUNDED
      .reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);

    return {
      journeyId,
      totalBilled,
      totalCollected,
      outstanding: totalBilled - totalCollected
    };
  }
}
