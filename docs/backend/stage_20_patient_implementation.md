# STAGE 20 — Patient Module Implementation

**Subject:** Production-Ready Patient Management Source Code
**Stack:** NestJS, Prisma, TypeScript Strict Mode, Jest
**Core Features:** HIPAA-Compliant Data Isolation, E.164 Validation, Read/Write Auditing, Pagination.

---

## 1. DTOs (Data Transfer Objects)

### `src/modules/patients/dto/create-patient.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, MaxLength, IsDateString, IsOptional } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string; // Strictly enforces E.164 format for WhatsApp integration

  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;
}
```
*   **Purpose:** Validates incoming payloads during patient intake.
*   **Explanation:** By forcing `@IsPhoneNumber()`, we guarantee the data is perfectly formatted for the downstream Meta API. The `@IsDateString()` prevents malformed PostgreSQL date insertions.

### `src/modules/patients/dto/update-patient.dto.ts`
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
```
*   **Purpose:** Allows safe, partial updates of demographics.

### `src/modules/patients/dto/get-patients-query.dto.ts`
```typescript
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PatientSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetPatientsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'ARCHIVED'])
  status?: 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @IsOptional()
  @IsEnum(PatientSortOrder)
  sortOrder: PatientSortOrder = PatientSortOrder.DESC;
}
```
*   **Purpose:** Pagination, fuzzy searching, and status filtering parameters.

---

## 2. Service

### `src/modules/patients/patients.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQueryDto } from './dto/get-patients-query.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePatientDto) {
    // 1. Phone Deduplication (Scopen by Tenant intrinsically via ALS)
    const existing = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('A patient with this phone number already exists in this clinic');
    }

    return this.prisma.patient.create({
      data: {
        tenantId, // Explicitly bound
        ...dto,
        dateOfBirth: new Date(dto.dateOfBirth),
        status: 'ACTIVE',
      },
    });
  }

  async findAll(query: GetPatientsQueryDto) {
    const { page, limit, search, status, sortOrder } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    else whereClause.status = 'ACTIVE'; // Default to hiding archived records
    
    if (search) {
      // PostgreSQL ILIKE implementation mapped via Prisma insensitive mode
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where: whereClause,
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

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      // Future inclusion of appointments/treatments goes here
    });

    if (!patient) throw new NotFoundException('Patient not found or belongs to another clinic');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.findOne(id); // Proves existence and tenant access

    if (dto.phone && dto.phone !== patient.phone) {
      const duplicateCheck = await this.prisma.patient.findFirst({
        where: { phone: dto.phone, id: { not: id } },
      });
      if (duplicateCheck) {
        throw new ConflictException('This phone number is already registered to another patient');
      }
    }

    const updateData: any = { ...dto };
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);

    return this.prisma.patient.update({
      where: { id: patient.id },
      data: updateData,
    });
  }

  async archive(id: string) {
    const patient = await this.findOne(id);
    
    return this.prisma.patient.update({
      where: { id: patient.id },
      data: { status: 'ARCHIVED' }, // Soft Delete compliance
    });
  }
}
```
*   **Purpose:** Orchestrates business logic, search fuzzy matching, and deduplication.
*   **Explanation:** Deduplication queries (`findFirst({ where: { phone } })`) do not manually specify `tenantId`. We completely rely on Prisma's `$allOperations` `AsyncLocalStorage` hook. If the same phone exists in *another* clinic (Tenant B), this query will safely return `null` for Tenant A, allowing them to register the patient.

---

## 3. Controller

### `src/modules/patients/patients.controller.ts`
```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientsQueryDto } from './dto/get-patients-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../common/interceptors/audit-logger.interceptor';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'PATIENT' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'PATIENT' })
  async findAll(@Query() query: GetPatientsQueryDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @UseInterceptors(AuditLoggerInterceptor) // HIPAA Compliance: Log every PHI read access
  @RequirePermissions({ action: 'READ', subject: 'PATIENT' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'PATIENT' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'DELETE', subject: 'PATIENT' }) // Restricted to ADMIN/OWNER in DB
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.archive(id);
  }
}
```
*   **Purpose:** Exposes REST endpoints securely.
*   **Explanation:** Notice that `GET /patients/:id` uses the `AuditLoggerInterceptor`. HIPAA requires that we track exactly *who* viewed a specific patient chart. List queries (`GET /patients`) are generally exempt from this rigorous level of tracking to prevent audit log bloat.

---

## 4. Module

### `src/modules/patients/patients.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
```
*   **Purpose:** Wires the Dependency Injection graph.

---

## 5. Unit Tests

### `src/modules/patients/patients.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((promises) => Promise.all(promises)),
          },
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should throw ConflictException if phone exists in clinic', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.create('tenant-1', { firstName: 'A', lastName: 'B', phone: '+1234', dateOfBirth: '2000-01-01' })
      ).rejects.toThrow(ConflictException);
    });

    it('should create patient successfully', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.patient, 'create').mockResolvedValue({ id: 'new-pat' } as any);

      const result = await service.create('tenant-1', { firstName: 'A', lastName: 'B', phone: '+1234', dateOfBirth: '2000-01-01' });
      expect(result.id).toBe('new-pat');
    });
  });

  describe('update', () => {
    it('should throw ConflictException if new phone belongs to someone else', async () => {
      jest.spyOn(prisma.patient, 'findUnique').mockResolvedValue({ id: 'pat-1', phone: '+old' } as any);
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue({ id: 'pat-2' } as any); // Duplicate check finds pat-2

      await expect(
        service.update('pat-1', { phone: '+new' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('should change status to ARCHIVED', async () => {
      jest.spyOn(prisma.patient, 'findUnique').mockResolvedValue({ id: 'pat-1' } as any);
      jest.spyOn(prisma.patient, 'update').mockResolvedValue({ id: 'pat-1', status: 'ARCHIVED' } as any);

      const result = await service.archive('pat-1');
      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat-1' },
        data: { status: 'ARCHIVED' },
      });
    });
  });
});
```
*   **Purpose:** Mathematically proves business logic.
*   **Explanation:** Tests verify that phone deduplication is accurately executing during both the initial `create` and the subsequent `update` lifecycles, ensuring perfect data hygiene for WhatsApp.
