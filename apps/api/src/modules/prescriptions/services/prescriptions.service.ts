import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async createPrescription(tenantId: string, doctorId: string, data: {
    patientId: string;
    appointmentId?: string;
    notes?: string;
    items: Array<{
      medicineName: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
  }) {
    // We create the prescription and its items in a single transaction
    return this.prisma.prescription.create({
      data: {
        tenantId,
        doctorId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions
          }))
        }
      },
      include: {
        items: true
      }
    });
  }

  async getPrescriptionsByPatient(tenantId: string, patientId: string) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId,
        patientId
      },
      include: {
        items: true,
        doctor: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPrescriptionById(tenantId: string, id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        doctor: {
          select: { id: true, firstName: true, lastName: true }
        },
        patient: {
          select: { id: true, name: true, phoneNumber: true }
        }
      }
    });

    if (!prescription || prescription.tenantId !== tenantId) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }
}
