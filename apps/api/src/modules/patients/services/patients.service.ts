import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async createPatient(tenantId: string, data: { name: string; phone: string; dob: string }) {
    // tenantId is forcefully injected into the creation payload by the $allOperations hook 
    // behind the scenes, ensuring the patient is correctly mapped to the clinic.
    return this.prisma.patient.create({
      data: {
        tenantId,
        name: data.name,
        phoneNumber: data.phone,
        dateOfBirth: new Date(data.dob),
      }
    });
  }

  async getPatients(search?: string) {
    return this.prisma.patient.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } }
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPatientById(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId } // tenantId auto-injected
    });

    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }
}
