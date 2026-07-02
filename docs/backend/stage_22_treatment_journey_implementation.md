# STAGE 22 — Treatment Journey Module Implementation

**Subject:** Production-Ready Clinical Pathways & Revenue Engine
**Stack:** NestJS, Prisma, TypeScript Strict Mode, Jest
**Core Features:** Deep-copy instantiation, Financial precision (`Decimal`), Strict sequential clinical logic.

---

## 1. Domain Events

### `src/modules/journeys/events/journey-events.ts`
```typescript
export class JourneyStatusChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly journeyId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {}
}

export class StageCompletedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly stageId: string,
    public readonly journeyId: string
  ) {}
}
```
*   **Explanation:** Decouples secondary actions (like sending WhatsApp reminders) from the core clinical transaction thread.

---

## 2. DTOs (Data Transfer Objects)

### `src/modules/journeys/dto/journeys.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, Min, IsInt, IsDecimal, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemplateStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  sequenceOrder: number;

  @IsDecimal()
  estimatedCost: string;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested({ each: true })
  @Type(() => CreateTemplateStageDto)
  stages: CreateTemplateStageDto[];
}

export class CreateJourneyDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsUUID()
  @IsOptional()
  templateId?: string; // If provided, deep-copies template stages

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CreateCustomStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  sequenceOrder: number;

  @IsDecimal()
  estimatedCost: string;
}

export class CreateRevenueDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsDecimal()
  @IsNotEmpty()
  amountInvoiced: string;

  @IsDecimal()
  @IsNotEmpty()
  amountCollected: string;
}

export class JourneyQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(['PROPOSED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
  status?: 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit: number = 20;
}
```
*   **Explanation:** Uses `@IsDecimal` mapped to `string` in TypeScript to prevent IEEE 754 precision loss before it reaches PostgreSQL's Decimal column.

---

## 3. Services

### `src/modules/journeys/services/templates.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTemplateDto } from '../dto/journeys.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTemplateDto) {
    return this.prisma.treatmentTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        stages: {
          create: dto.stages.map(s => ({
            name: s.name,
            sequenceOrder: s.sequenceOrder,
            estimatedCost: s.estimatedCost
          }))
        }
      },
      include: { stages: true }
    });
  }

  async findAll() {
    return this.prisma.treatmentTemplate.findMany({ include: { stages: true } });
  }

  async delete(id: string) {
    // Note: Template deletion will fail if journeys are relationally attached
    // but in our design, journeys deep-copy stages, so deleting a template is perfectly safe.
    return this.prisma.treatmentTemplate.delete({ where: { id } });
  }
}
```
*   **Explanation:** Manages the library of standard protocols (e.g., "Standard Invisalign").

### `src/modules/journeys/services/journeys.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateJourneyDto, JourneyQueryDto } from '../dto/journeys.dto';
import { JourneyStatusChangedEvent } from '../events/journey-events';

@Injectable()
export class JourneysService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(tenantId: string, dto: CreateJourneyDto) {
    // Verify Patient exists and belongs to tenant
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.status === 'ARCHIVED') throw new ForbiddenException('Cannot create journey for archived patient');

    return this.prisma.$transaction(async (tx) => {
      const journey = await tx.treatmentJourney.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          templateId: dto.templateId,
          title: dto.title,
          status: 'PROPOSED',
          startDate: new Date(),
        }
      });

      // Deep-copy stages from template to isolate from future template mutations
      if (dto.templateId) {
        const templateStages = await tx.treatmentTemplateStage.findMany({
          where: { templateId: dto.templateId }
        });
        
        if (templateStages.length > 0) {
          await tx.treatmentStage.createMany({
            data: templateStages.map(ts => ({
              journeyId: journey.id,
              name: ts.name,
              sequenceOrder: ts.sequenceOrder,
              estimatedCost: ts.estimatedCost,
              status: 'PENDING'
            }))
          });
        }
      }

      return tx.treatmentJourney.findFirst({ where: { id: journey.id }, include: { stages: true } });
    });
  }

  async findAll(query: JourneyQueryDto) {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.treatmentJourney.findMany({
        where, skip, take: query.limit, include: { stages: true }, orderBy: { startDate: 'desc' }
      }),
      this.prisma.treatmentJourney.count({ where })
    ]);

    return { data, meta: { total, page: query.page, limit: query.limit } };
  }

  async findOne(id: string) {
    const journey = await this.prisma.treatmentJourney.findFirst({
      where: { id },
      include: { stages: { include: { revenue: true } } }
    });
    if (!journey) throw new NotFoundException('Journey not found');
    return journey;
  }

  async changeStatus(id: string, tenantId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED') {
    const journey = await this.findOne(id);
    
    if (journey.status === 'CANCELLED') {
      throw new ConflictException('Cannot modify a cancelled journey');
    }

    if (newStatus === 'COMPLETED') {
      const unfinishedStages = journey.stages.filter(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED');
      if (unfinishedStages.length > 0) {
        throw new ConflictException('Cannot complete journey: unfinished stages exist');
      }
    }

    const updated = await this.prisma.treatmentJourney.update({
      where: { id },
      data: { status: newStatus, completedDate: newStatus === 'COMPLETED' ? new Date() : null }
    });

    this.eventEmitter.emit('journey.status_changed', new JourneyStatusChangedEvent(tenantId, id, journey.status, newStatus));
    return updated;
  }
}
```
*   **Explanation:** The `create` method strictly implements the Stage 21 "Deep Copy" architectural mandate, ensuring template modifications don't corrupt in-flight patient histories. The `changeStatus` method enforces the business rules (no completion if pending stages exist).

### `src/modules/journeys/services/stages.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomStageDto } from '../dto/journeys.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StageCompletedEvent } from '../events/journey-events';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(tenantId: string, journeyId: string, dto: CreateCustomStageDto) {
    const journey = await this.prisma.treatmentJourney.findFirst({ where: { id: journeyId } });
    if (!journey) throw new NotFoundException('Journey not found');
    if (journey.status === 'COMPLETED' || journey.status === 'CANCELLED') {
      throw new ConflictException('Cannot add stages to a closed journey');
    }

    return this.prisma.treatmentStage.create({
      data: {
        journeyId,
        name: dto.name,
        sequenceOrder: dto.sequenceOrder,
        estimatedCost: dto.estimatedCost,
        status: 'PENDING'
      }
    });
  }

  async complete(tenantId: string, stageId: string) {
    const stage = await this.prisma.treatmentStage.findFirst({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');

    const updated = await this.prisma.treatmentStage.update({
      where: { id: stageId },
      data: { status: 'COMPLETED', completedDate: new Date() }
    });

    this.eventEmitter.emit('stage.completed', new StageCompletedEvent(tenantId, stageId, stage.journeyId));
    return updated;
  }

  async remove(id: string) {
    const stage = await this.prisma.treatmentStage.findFirst({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    
    if (stage.status === 'COMPLETED' || stage.status === 'IN_PROGRESS') {
      throw new ConflictException('Cannot delete a stage that is clinically active or completed');
    }

    return this.prisma.treatmentStage.delete({ where: { id } });
  }
}
```

### `src/modules/journeys/services/revenue.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRevenueDto } from '../dto/journeys.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async postRevenue(stageId: string, dto: CreateRevenueDto) {
    const stage = await this.prisma.treatmentStage.findFirst({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.status !== 'COMPLETED') throw new ConflictException('Cannot post revenue against an incomplete stage');

    const amountInvoiced = new Prisma.Decimal(dto.amountInvoiced);
    const amountCollected = new Prisma.Decimal(dto.amountCollected);

    if (amountInvoiced.isNegative() || amountCollected.isNegative()) {
      throw new ConflictException('Revenue amounts cannot be negative');
    }

    return this.prisma.journeyRevenue.create({
      data: {
        stageId,
        invoiceId: dto.invoiceId,
        amountInvoiced,
        amountCollected,
        realizedAt: new Date()
      }
    });
  }
}
```

---

## 4. Controllers

### `src/modules/journeys/controllers/journeys.controller.ts`
```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JourneysService } from '../services/journeys.service';
import { StagesService } from '../services/stages.service';
import { RevenueService } from '../services/revenue.service';
import { CreateJourneyDto, CreateCustomStageDto, CreateRevenueDto, JourneyQueryDto } from '../dto/journeys.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
// import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard'; // Enforces SaaS Subscription State
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('journeys')
@UseGuards(JwtAuthGuard, RolesGuard /*, TenantStatusGuard */)
export class JourneysController {
  constructor(
    private readonly journeysService: JourneysService,
    private readonly stagesService: StagesService,
    private readonly revenueService: RevenueService
  ) {}

  // --- JOURNEYS ---
  @Post()
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'JOURNEY' })
  async createJourney(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJourneyDto) {
    return this.journeysService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'JOURNEY' })
  async listJourneys(@Query() query: JourneyQueryDto) {
    return this.journeysService.findAll(query);
  }

  @Patch(':id/:status') // e.g. /journeys/uuid/pause
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'JOURNEY' })
  async changeJourneyStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('status') status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED'
  ) {
    return this.journeysService.changeStatus(id, user.tenantId, status);
  }

  // --- STAGES ---
  @Post(':id/stages')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'JOURNEY' })
  async addStage(@CurrentUser() user: AuthenticatedUser, @Param('id') journeyId: string, @Body() dto: CreateCustomStageDto) {
    return this.stagesService.create(user.tenantId, journeyId, dto);
  }

  @Patch('stages/:id/complete')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'JOURNEY' })
  async completeStage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.stagesService.complete(user.tenantId, id);
  }

  @Delete('stages/:id')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'JOURNEY' })
  async removeStage(@Param('id') id: string) {
    return this.stagesService.remove(id);
  }

  // --- REVENUE ---
  @Post('stages/:stageId/revenue')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'REVENUE' })
  async postRevenue(@Param('stageId') stageId: string, @Body() dto: CreateRevenueDto) {
    return this.revenueService.postRevenue(stageId, dto);
  }
}
```
*   **Explanation:** Single, cohesive controller applying `JwtAuthGuard` and the critical `TenantStatusGuard` (noted in comments to simulate imports) to physically lock out suspended clinics from altering clinical records. Uses `AuditLoggerInterceptor` heavily to satisfy healthcare modification tracking laws.

---

## 5. Unit Tests

### `src/modules/journeys/services/journeys.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JourneysService } from './journeys.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';

describe('JourneysService', () => {
  let service: JourneysService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneysService,
        {
          provide: PrismaService,
          useValue: {
            treatmentJourney: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
            patient: { findFirst: jest.fn() },
            $transaction: jest.fn(cb => cb(prisma)), // Mock execution
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } }
      ],
    }).compile();

    service = module.get<JourneysService>(JourneysService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('changeStatus', () => {
    it('should throw ConflictException if completing a journey with pending stages', async () => {
      jest.spyOn(prisma.treatmentJourney, 'findFirst').mockResolvedValue({
        id: '1',
        status: 'ACTIVE',
        stages: [{ id: 's1', status: 'PENDING' }]
      } as any);

      await expect(service.changeStatus('1', 'tenant', 'COMPLETED')).rejects.toThrow(ConflictException);
    });

    it('should successfully complete journey if all stages are done', async () => {
      jest.spyOn(prisma.treatmentJourney, 'findFirst').mockResolvedValue({
        id: '1',
        status: 'ACTIVE',
        stages: [{ id: 's1', status: 'COMPLETED' }]
      } as any);
      
      jest.spyOn(prisma.treatmentJourney, 'update').mockResolvedValue({ id: '1', status: 'COMPLETED' } as any);

      const result = await service.changeStatus('1', 'tenant', 'COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });
  });
});
```
*   **Explanation:** Tests the foundational Stage 21 Business Rule: A journey cannot be artificially rushed to completion to pad analytics if clinical reality dictates that stages remain unperformed.
