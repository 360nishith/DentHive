import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async createMedicine(tenantId: string, doctorId: string, data: {
    medicineName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }) {
    return this.prisma.doctorMedicine.create({
      data: {
        tenantId,
        doctorId,
        ...data
      }
    });
  }

  async getMedicines(tenantId: string, doctorId?: string) {
    // Clinic staff can view all medicines for the clinic. 
    // If a doctorId is provided, we can filter by that specific doctor.
    return this.prisma.doctorMedicine.findMany({
      where: {
        tenantId,
        ...(doctorId ? { doctorId } : {})
      },
      orderBy: { medicineName: 'asc' }
    });
  }

  async updateMedicine(tenantId: string, doctorId: string, id: string, data: any) {
    const medicine = await this.prisma.doctorMedicine.findUnique({ where: { id } });
    if (!medicine || medicine.tenantId !== tenantId) {
      throw new NotFoundException('Medicine not found');
    }
    // Only the doctor who created it (or maybe clinic admin, but here we enforce doctor ownership)
    if (medicine.doctorId !== doctorId) {
      throw new UnauthorizedException('You can only edit your own medicines');
    }

    return this.prisma.doctorMedicine.update({
      where: { id },
      data
    });
  }

  async deleteMedicine(tenantId: string, doctorId: string, id: string) {
    const medicine = await this.prisma.doctorMedicine.findUnique({ where: { id } });
    if (!medicine || medicine.tenantId !== tenantId) {
      throw new NotFoundException('Medicine not found');
    }
    if (medicine.doctorId !== doctorId) {
      throw new UnauthorizedException('You can only delete your own medicines');
    }

    return this.prisma.doctorMedicine.delete({
      where: { id }
    });
  }
}
