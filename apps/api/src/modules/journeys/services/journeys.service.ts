import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JourneysService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-reminders') private readonly whatsappQueue: Queue
  ) {}

  async createJourney(tenantId: string, payload: { patientId: string; templateId?: string; name?: string }) {
    let template = null;
    if (payload.templateId) {
      template = await this.prisma.treatmentTemplate.findFirst({
        where: { id: payload.templateId, tenantId },
        include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
      });
      if (!template) throw new BadRequestException('Template not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create the journey
      const journey = await tx.treatmentJourney.create({
        data: {
          tenantId,
          patientId: payload.patientId,
          templateId: payload.templateId || null,
          status: 'ACTIVE',
          totalCost: template ? template.estimatedCost : 0
        }
      });

      // If we have a template, initialize its stages
      if (template && template.stages.length > 0) {
        const stagesToCreate = template.stages.map((ts, index) => ({
          tenantId,
          journeyId: journey.id,
          templateStageId: ts.id,
          name: ts.name,
          cost: ts.cost || 0,
          sequenceOrder: index + 1,
          status: 'PENDING'
        }));

        await tx.treatmentStage.createMany({
          data: stagesToCreate
        });

        const createdStages = await tx.treatmentStage.findMany({
          where: { journeyId: journey.id },
          orderBy: { sequenceOrder: 'asc' }
        });

        const firstStage = createdStages[0];
        if (firstStage) {
          await tx.treatmentJourney.updateMany({
            where: { id: journey.id },
            data: { currentStageId: firstStage.id }
          });
        }
      }

      return journey;
    });
  }

  async getAllJourneys(tenantId: string) {
    return this.prisma.treatmentJourney.findMany({
      where: { 
        tenantId,
        patient: { status: 'ACTIVE' }
      },
      include: {
        patient: true,
        template: true,
        stages: {
          include: {
            appointments: true
          },
          orderBy: { sequenceOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getJourneysByPatient(tenantId: string, patientId: string) {
    return this.prisma.treatmentJourney.findMany({
      where: { tenantId, patientId },
      include: {
        template: true,
        stages: {
          include: { templateStage: true },
          orderBy: { sequenceOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async advanceStage(tenantId: string, journeyId: string, currentStageOrder: number) {
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id: journeyId, tenantId },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });

    if (!journey) throw new BadRequestException('Journey not found');
    if (journey.status === 'COMPLETED') throw new BadRequestException('Journey is already completed');

    const nextStage = journey.stages.find((s: any) => s.sequenceOrder > currentStageOrder);
    
    if (!nextStage) {
      // It's the final stage. We must complete the stage and appointment too.
      const currentStage = journey.stages.find((s: any) => s.sequenceOrder === currentStageOrder);
      if (currentStage) {
        await this.prisma.treatmentStage.updateMany({
          where: { id: currentStage.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        const apptsToCancel = await this.prisma.appointment.findMany({
          where: { treatmentStageId: currentStage.id, status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } }
        });
        await this.prisma.appointment.updateMany({
          where: { treatmentStageId: currentStage.id, status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } },
          data: { status: 'COMPLETED' }
        });
        for (const appt of apptsToCancel) {
          const job = await this.whatsappQueue.getJob(`remind-${appt.id}`);
          if (job) await job.remove().catch(() => {});
        }
      }

      await this.prisma.treatmentJourney.updateMany({
        where: { id: journeyId },
        data: { status: 'COMPLETED' }
      });
      return this.prisma.treatmentJourney.findFirst({ where: { id: journeyId } });
    }

    await this.prisma.$transaction(async (tx: any) => {
      const currentStage = journey.stages.find((s: any) => s.sequenceOrder === currentStageOrder);
      if (currentStage) {
        await tx.treatmentStage.updateMany({
          where: { id: currentStage.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        const apptsToCancel = await tx.appointment.findMany({
          where: { 
            treatmentStageId: currentStage.id, 
            status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } 
          }
        });
        await tx.appointment.updateMany({
          where: { 
            treatmentStageId: currentStage.id, 
            status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } 
          },
          data: { status: 'COMPLETED' }
        });
        for (const appt of apptsToCancel) {
          const job = await this.whatsappQueue.getJob(`remind-${appt.id}`);
          if (job) await job.remove().catch(() => {});
        }
      }

      await tx.treatmentJourney.updateMany({
        where: { id: journeyId },
        data: { currentStageId: nextStage.id }
      });
    });

    return this.prisma.treatmentJourney.findFirst({ where: { id: journeyId } });
  }

  async updateJourneyStatus(tenantId: string, journeyId: string, status: 'CANCELLED' | 'ACTIVE' | 'COMPLETED') {
    await this.prisma.treatmentJourney.updateMany({
      where: { id: journeyId, tenantId },
      data: { status }
    });
    return { success: true };
  }

  async deleteJourney(tenantId: string, journeyId: string) {
    const paymentCount = await this.prisma.payment.count({
      where: { journeyId, status: 'SUCCESS' }
    });
    if (paymentCount > 0) {
      throw new BadRequestException(
        `Cannot delete: this journey has ${paymentCount} payment record(s). Archive it instead.`
      );
    }
    // Appointments restrict stage deletion, so we must delete them FIRST
    const stages = await this.prisma.treatmentStage.findMany({ where: { journeyId, tenantId }, select: { id: true } });
    const stageIds = stages.map(s => s.id);

    await this.prisma.payment.deleteMany({ where: { journeyId, status: { not: 'SUCCESS' } } });
    await this.prisma.appointment.deleteMany({ where: { treatmentStageId: { in: stageIds } } });
    await this.prisma.treatmentStage.deleteMany({ where: { journeyId, tenantId } });
    return this.prisma.treatmentJourney.deleteMany({ where: { id: journeyId, tenantId } });
  }

  // ---- DYNAMIC STAGE MANAGEMENT ----

  private async recalculateJourneyCost(tx: any, journeyId: string) {
    const sumResult = await tx.treatmentStage.aggregate({
      where: { journeyId },
      _sum: { cost: true }
    });
    const totalCost = sumResult._sum.cost || 0;
    await tx.treatmentJourney.updateMany({
      where: { id: journeyId },
      data: { totalCost }
    });
    return totalCost;
  }

  async addStage(tenantId: string, journeyId: string, data: { name: string; cost: number }) {
    return this.prisma.$transaction(async (tx) => {
      // Find the highest sequence order
      const lastStage = await tx.treatmentStage.findFirst({
        where: { journeyId },
        orderBy: { sequenceOrder: 'desc' }
      });
      const newOrder = lastStage ? lastStage.sequenceOrder + 1 : 1;

      const stage = await tx.treatmentStage.create({
        data: {
          tenantId,
          journeyId,
          name: data.name,
          cost: data.cost,
          sequenceOrder: newOrder,
          status: 'PENDING'
        }
      });

      // If this is the very first stage, set it as current
      if (newOrder === 1) {
        await tx.treatmentJourney.updateMany({
          where: { id: journeyId },
          data: { currentStageId: stage.id }
        });
      }

      await this.recalculateJourneyCost(tx, journeyId);
      return stage;
    });
  }

  async updateStage(tenantId: string, journeyId: string, stageId: string, data: { name?: string; cost?: number }) {
    return this.prisma.$transaction(async (tx) => {
      const stage = await tx.treatmentStage.updateMany({
        where: { id: stageId, journeyId, tenantId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.cost !== undefined && { cost: data.cost })
        }
      });
      await this.recalculateJourneyCost(tx, journeyId);
      return stage;
    });
  }

  async deleteStage(tenantId: string, journeyId: string, stageId: string) {
    return this.prisma.$transaction(async (tx) => {
      const stage = await tx.treatmentStage.findFirst({
        where: { id: stageId, journeyId, tenantId }
      });
      if (!stage) throw new BadRequestException('Stage not found');
      if (stage.status === 'COMPLETED') throw new BadRequestException('Cannot delete a completed stage');

      await tx.appointment.deleteMany({ where: { treatmentStageId: stageId } });
      await tx.treatmentStage.deleteMany({ where: { id: stageId, journeyId, tenantId } });
      await this.recalculateJourneyCost(tx, journeyId);
      return { success: true };
    });
  }
}
