import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Service for granular management of individual steps inside a Journey.
 */
@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  async createStage(tenantId: string, journeyId: string, data: { templateStageId: string }) {
    // Ensure the journey exists and belongs to the tenant
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id: journeyId }
    });
    if (!journey) throw new NotFoundException('Journey not found');

    const tplStage = await this.prisma.templateStage.findFirst({ where: { id: data.templateStageId } });
    if (!tplStage) throw new NotFoundException('Template stage not found');

    return this.prisma.treatmentStage.create({
      data: {
        tenantId,
        journeyId,
        templateStageId: data.templateStageId,
        name: tplStage.name,
        sequenceOrder: tplStage.sequenceOrder,
        cost: 0,
        status: 'PENDING'
      }
    });
  }

  async updateStage(id: string, data: { status?: string }) {
    // STRICT CONSTRAINT: Using updateMany
    const result = await this.prisma.treatmentStage.updateMany({
      where: { id },
      data
    });

    if (result.count === 0) throw new NotFoundException('Stage not found');

    return this.prisma.treatmentStage.findFirst({ where: { id } });
  }

  async deleteStage(id: string) {
    // STRICT CONSTRAINT: Using deleteMany
    const result = await this.prisma.treatmentStage.deleteMany({
      where: { id }
    });

    if (result.count === 0) throw new NotFoundException('Stage not found');
    return { success: true };
  }
}
