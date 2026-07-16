import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { als } from '../../../common/context/als';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. FAST PATH: Fetch Historical Data from the flat Snapshot table
    /*
    const historicalSnapshots = await this.prisma.analyticsSnapshot.aggregate({
      where: {
        tenantId,
        date: { gte: startDate, lt: today } 
      },
      _sum: { appointmentsCompleted: true }
    });
    */
    const historicalSnapshots = { _sum: { appointmentsCompleted: 0 } };

    // 2. HYBRID PATH: Run a tiny dynamic query strictly for *Today's* real-time data
    return als.run({}, async () => {
      const todaysAppointments = await this.prisma.appointment.aggregate({
        where: {
          tenantId,
          scheduledStart: { gte: today, lte: endDate }
        },
        _count: { _all: true }
      });

      const totalAppointments = 
        Number(historicalSnapshots._sum.appointmentsCompleted || 0) + 
        Number(todaysAppointments._count?._all ?? 0);

      return { appointmentsCompleted: totalAppointments };
    });
  }
}
