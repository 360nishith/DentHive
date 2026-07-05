import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Service handling reusable Treatment Journey Blueprints.
 */
@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async createTemplate(tenantId: string, data: { name: string; estimatedCost?: number; stages?: { sequenceOrder: number; name: string; defaultIntervalDays: number; cost?: number }[] }) {
    // Auto-calculate estimatedCost from stages
    let calculatedEstimatedCost = data.estimatedCost || 0;
    if (data.stages && data.stages.length > 0) {
      calculatedEstimatedCost = data.stages.reduce((sum, stage) => sum + (stage.cost || 0), 0);
    }

    return this.prisma.treatmentTemplate.create({
      data: {
        tenantId,
        name: data.name,
        estimatedCost: calculatedEstimatedCost,
        stages: data.stages && data.stages.length > 0 ? {
          create: data.stages.map(s => ({
            sequenceOrder: s.sequenceOrder,
            name: s.name,
            defaultIntervalDays: s.defaultIntervalDays || 0,
            cost: s.cost || 0,
          }))
        } : undefined,
      },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.treatmentTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTemplateById(tenantId: string, id: string) {
    // STRICT CONSTRAINT: Using findFirst instead of findUnique
    const template = await this.prisma.treatmentTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(tenantId: string, id: string, data: { name?: string }) {
    // STRICT CONSTRAINT: Using updateMany instead of update
    const result = await this.prisma.treatmentTemplate.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name && { name: data.name })
      }
    });

    if (result.count === 0) throw new NotFoundException('Template not found');
    
    // Return the updated object
    return this.getTemplateById(tenantId, id);
  }

  async deleteTemplate(tenantId: string, id: string) {
    // STRICT CONSTRAINT: Using deleteMany instead of delete
    const result = await this.prisma.treatmentTemplate.deleteMany({
      where: { id, tenantId }
    });

    if (result.count === 0) throw new NotFoundException('Template not found');
    return { success: true };
  }

  async seedTemplates(tenantId: string) {
    const rootCanal = await this.prisma.treatmentTemplate.create({
      data: {
        tenantId,
        name: 'Root Canal Treatment (RCT)',
        estimatedCost: 12000,
        stages: {
          create: [
            { sequenceOrder: 1, name: 'Initial Consultation & X-Ray', defaultIntervalDays: 0 },
            { sequenceOrder: 2, name: 'Pulp Extirpation & Cleaning', defaultIntervalDays: 2 },
            { sequenceOrder: 3, name: 'Obturation (Filling)', defaultIntervalDays: 7 },
            { sequenceOrder: 4, name: 'Crown Placement', defaultIntervalDays: 14 },
          ]
        }
      }
    });

    const aligners = await this.prisma.treatmentTemplate.create({
      data: {
        tenantId,
        name: 'Clear Aligners (Invisalign)',
        estimatedCost: 150000,
        stages: {
          create: [
            { sequenceOrder: 1, name: '3D Scanning & Impression', defaultIntervalDays: 0 },
            { sequenceOrder: 2, name: 'ClinCheck Review & Approval', defaultIntervalDays: 10 },
            { sequenceOrder: 3, name: 'First Aligner Delivery', defaultIntervalDays: 14 },
            { sequenceOrder: 4, name: 'Mid-Course Review', defaultIntervalDays: 45 },
            { sequenceOrder: 5, name: 'Retainer Placement', defaultIntervalDays: 180 },
          ]
        }
      }
    });

    return { success: true, seeded: [rootCanal, aligners] };
  }
}
