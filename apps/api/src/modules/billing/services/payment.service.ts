import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async recordPayment(tenantId: string, data: {
    journeyId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
  }) {
    // Validate: don't allow overpayment
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id: data.journeyId, tenantId },
      include: { 
        payments: { where: { status: 'SUCCESS' } },
        patient: true,
        template: true
      }
    });
    if (!journey) throw new Error('Journey not found');
    const totalPaid = journey.payments.reduce((s: number, p: any) => s + p.amount, 0);
    let balance = journey.totalCost - totalPaid;
    
    // Automatically adjust totalCost for ad-hoc custom journeys with 0 cost
    if (journey.totalCost === 0 && !journey.templateId) {
      await this.prisma.treatmentJourney.update({
        where: { id: journey.id },
        data: { totalCost: data.amount + totalPaid }
      });
      balance = data.amount; 
    }

    if (data.amount <= 0) throw new Error('Amount must be greater than zero');
    if (data.amount > balance) throw new Error(`Amount ₹${data.amount} exceeds balance ₹${balance}`);

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        doctorId: journey.doctorId || undefined,
        journeyId: data.journeyId,
        amount: data.amount,
        paymentMethod: data.paymentMethod.toUpperCase(),
        status: 'SUCCESS',
      }
    });

    this.eventEmitter.emit('payment.collected', { payment, journey, patient: journey.patient });

    return payment;
  }

  async getJourneySummary(tenantId: string, journeyId: string) {
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id: journeyId, tenantId },
      include: {
        payments: { orderBy: { recordedAt: 'desc' } },
        patient: { select: { id: true, name: true } },
        template: { select: { name: true } },
        tenant: { select: { name: true } },
        doctor: { select: { upiVpa: true } },
      }
    });
    if (!journey) return null;

    const totalPaid = journey.payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const balance = journey.totalCost - totalPaid;

    return {
      journeyId: journey.id,
      patientId: journey.patient.id,
      patientName: journey.patient.name,
      templateName: journey.template?.name || 'Custom Journey',
      totalCost: journey.totalCost,
      totalPaid,
      balance,
      status: balance <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
      payments: journey.payments,
      upiVpa: journey.doctor?.upiVpa,
      clinicName: journey.tenant?.name,
    };
  }

  async getPatientPayments(tenantId: string, patientId: string) {
    const journeys = await this.prisma.treatmentJourney.findMany({
      where: { tenantId, patientId },
      include: {
        payments: { orderBy: { recordedAt: 'desc' } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    return journeys.map(j => {
      const totalPaid = j.payments
        .filter(p => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        journeyId: j.id,
        templateName: j.template?.name || 'Custom Journey',
        journeyStatus: j.status,
        totalCost: j.totalCost,
        totalPaid,
        balance: j.totalCost - totalPaid,
        paymentStatus: (j.totalCost - totalPaid) <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID',
        payments: j.payments,
      };
    });
  }

  async getRevenueStats(tenantId: string) {
    const now = new Date();
    
    // Force revenue boundaries to align with Indian Standard Time (IST)
    const tzOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + tzOffsetMs);
    
    const startOfDayIstStr = `${nowIst.getUTCFullYear()}-${String(nowIst.getUTCMonth() + 1).padStart(2, '0')}-${String(nowIst.getUTCDate()).padStart(2, '0')}T00:00:00.000+05:30`;
    const startOfDay = new Date(startOfDayIstStr);
    
    const startOfMonthIstStr = `${nowIst.getUTCFullYear()}-${String(nowIst.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00.000+05:30`;
    const startOfMonth = new Date(startOfMonthIstStr);

    const [
      todayPayments, 
      monthPayments, 
      allPayments, 
      outstandingJourneys,
      activePatients,
      appointments30d,
      recentPayments
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'SUCCESS', recordedAt: { gte: startOfDay } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'SUCCESS', recordedAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      // Journeys with balance due — exclude CANCELLED (aborted) journeys
      this.prisma.treatmentJourney.findMany({
        where: { tenantId, status: { not: 'CANCELLED' } },
        include: {
          payments: { where: { status: 'SUCCESS' } },
          patient: { select: { name: true, phoneNumber: true } },
          template: { select: { name: true } },
        }
      }),
      this.prisma.treatmentJourney.count({
        where: { tenantId, status: 'ACTIVE' }
      }),
      this.prisma.appointment.count({
        where: { tenantId, scheduledStart: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.payment.findMany({
        where: { tenantId, status: 'SUCCESS' },
        orderBy: { recordedAt: 'desc' },
        take: 5,
        include: {
          journey: { include: { template: true } }
        }
      })
    ]);

    const outstanding = outstandingJourneys
      .map(j => {
        const paid = j.payments.reduce((s, p) => s + p.amount, 0);
        return { 
          ...j, 
          template: j.template ? j.template : { name: 'Custom Journey' },
          paid, 
          balance: j.totalCost - paid 
        };
      })
      .filter(j => j.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    return {
      today: {
        amount: todayPayments._sum.amount || 0,
        count: todayPayments._count,
      },
      month: {
        amount: monthPayments._sum.amount || 0,
        count: monthPayments._count,
      },
      total: allPayments._sum.amount || 0,
      outstandingCount: outstanding.length,
      outstandingTotal: outstanding.reduce((s, j) => s + j.balance, 0),
      outstanding: outstanding.slice(0, 10), // top 10
      activePatients,
      appointments30d,
      recentPayments
    };
  }

  async getRevenueCharts(tenantId: string) {
    // Fetch all successful payments for the tenant
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: 'SUCCESS' },
      select: { amount: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' }
    });

    const dailyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const yearlyMap = new Map<string, number>();

    for (const p of payments) {
      const date = new Date(p.recordedAt);
      
      // Localize to IST since clinic is in India (or generic local time based on server)
      // Formatting key
      const dKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      const yKey = `${date.getFullYear()}`; // YYYY

      dailyMap.set(dKey, (dailyMap.get(dKey) || 0) + p.amount);
      monthlyMap.set(mKey, (monthlyMap.get(mKey) || 0) + p.amount);
      yearlyMap.set(yKey, (yearlyMap.get(yKey) || 0) + p.amount);
    }

    const formatData = (map: Map<string, number>) => {
      return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
    };

    return {
      daily: formatData(dailyMap),
      monthly: formatData(monthlyMap),
      yearly: formatData(yearlyMap),
    };
  }
}
