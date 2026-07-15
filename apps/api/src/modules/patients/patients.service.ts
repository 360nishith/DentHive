import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQueryDto } from './dto/get-patients-query.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePatientDto) {
    // Phone deduplication has been removed to allow families (e.g. parent/child) to share phone numbers.

    return this.prisma.patient.create({
      data: {
        tenantId,
        doctorId: dto.doctorId || undefined, // If STAFF creates it without selecting, it might be undefined, though frontend will enforce it. If DENTIST creates, hook overrides it.
        name: `${dto.firstName} ${dto.lastName}`,
        phoneNumber: dto.phone,
        gender: dto.gender || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        whatsappOptIn: dto.whatsappOptIn ?? true,
        status: 'ACTIVE',
      },
    });
  }

  async findAll(tenantId: string, query: GetPatientsQueryDto) {
    const page = parseInt(String(query.page ?? 1));
    const limit = parseInt(String(query.limit ?? 10));
    const { search, status, doctorId } = query;
    const sortOrder = query.sortOrder || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = { tenantId };
    if (status) whereClause.status = status;
    else whereClause.status = 'ACTIVE'; // Default to hiding archived records
    
    if (doctorId) whereClause.doctorId = doctorId;
    
    if (search) {
      // PostgreSQL ILIKE implementation mapped via Prisma insensitive mode
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where: whereClause,
        include: {
          doctor: {
            select: { firstName: true, lastName: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
      }),
      this.prisma.patient.count({ where: whereClause }),
    ]);

    return {
      data: patients,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    // FIX: Using findFirst instead of findUnique to permit ALS extension to append non-unique tenantId
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        doctor: { select: { firstName: true, lastName: true } }
      }
    });

    if (!patient) throw new NotFoundException('Patient not found or belongs to another clinic');
    return patient;
  }

  async update(tenantId: string, id: string, dto: UpdatePatientDto) {
    const patient = await this.findOne(tenantId, id); // Proves existence and tenant access

    // Phone deduplication has been removed to allow families (e.g. parent/child) to share phone numbers.

    const updateData: any = {};
    if (dto.firstName || dto.lastName) {
      const nameParts = patient.name.split(' ');
      const newFirst = dto.firstName || nameParts[0];
      const newLast = dto.lastName || nameParts.slice(1).join(' ');
      updateData.name = `${newFirst} ${newLast}`;
    }
    if (dto.phone) updateData.phoneNumber = dto.phone;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.whatsappOptIn !== undefined) updateData.whatsappOptIn = dto.whatsappOptIn;
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.age) {
      const dobYear = new Date().getFullYear() - parseInt(dto.age);
      updateData.dateOfBirth = new Date(`${dobYear}-01-01`);
    }

    await this.prisma.patient.updateMany({
      where: { id: patient.id },
      data: updateData,
    });
    return this.prisma.patient.findFirst({ where: { id: patient.id } });
  }

  async archive(tenantId: string, id: string) {
    const patient = await this.findOne(tenantId, id);
    
    await this.prisma.patient.updateMany({
      where: { id: patient.id },
      data: { status: 'ARCHIVED' }, // Soft Delete compliance
    });
    return this.prisma.patient.findFirst({ where: { id: patient.id } });
  }
}
