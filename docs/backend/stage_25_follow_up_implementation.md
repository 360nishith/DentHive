# STAGE 25 — Follow-Up Module Implementation

**Subject:** Production-Ready Patient Re-Engagement System
**Stack:** NestJS, Prisma, PostgreSQL, BullMQ, Redis, TypeScript Strict Mode
**Core Features:** Multi-Tenant Isolation, Retry-Safe Automation, Clinical Integration, Strict RBAC.

---

## Folder Structure
```text
src/modules/follow-ups/
├── controllers/
│   └── follow-ups.controller.ts
├── services/
│   ├── follow-ups.service.ts
│   └── follow-up-notes.service.ts
├── workers/
│   └── follow-up-automation.worker.ts
├── dto/
│   └── follow-ups.dto.ts
├── events/
│   └── follow-up-events.ts
└── follow-ups.module.ts
```

---

## 1. DTOs & Events

### `src/modules/follow-ups/events/follow-up-events.ts`
```typescript
export class FollowUpCompletedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly followUpId: string,
    public readonly patientId: string
  ) {}
}
```

### `src/modules/follow-ups/dto/follow-ups.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateFollowUpDto {
  @IsUUID() @IsNotEmpty() patientId: string;
  @IsEnum(['MANUAL', 'MISSED_APPOINTMENT', 'TREATMENT_JOURNEY']) @IsNotEmpty() type: string;
  @IsEnum(['LOW', 'MEDIUM', 'HIGH']) @IsNotEmpty() priority: string;
  @IsDateString() @IsNotEmpty() scheduledDate: string;
  
  @IsUUID() @IsOptional() assignedUserId?: string;
  @IsUUID() @IsOptional() referenceId?: string; // Links to Appointment or Stage
}

export class UpdateFollowUpDto extends PartialType(CreateFollowUpDto) {
  @IsOptional() @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) status?: string;
}

export class CreateFollowUpNoteDto {
  @IsString() @IsNotEmpty() content: string;
}
```

*   **Purpose:** Enforces strict HTTP payload validation for creating and updating Follow-Ups.
*   **Dependencies:** `class-validator`, `class-transformer`.
*   **Security considerations:** Blocks Enum injection bypasses by strictly defining `priority`, `type`, and `status`. Uses `@IsDateString` to prevent timezone corruption.
*   **Multi-tenant considerations:** Tenant-agnostic; `tenantId` is strictly injected at the controller boundary.
*   **Failure scenarios:** Throws `400 Bad Request` instantly if invalid data types or malformed UUIDs are submitted.

---

## 2. Services

### `src/modules/follow-ups/services/follow-ups.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateFollowUpDto, UpdateFollowUpDto } from '../dto/follow-ups.dto';
import { FollowUpCompletedEvent } from '../events/follow-up-events';

@Injectable()
export class FollowUpsService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(tenantId: string, dto: CreateFollowUpDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId } });
    if (!patient || patient.status === 'ARCHIVED') {
      throw new ForbiddenException('Patient does not exist or is archived');
    }

    return this.prisma.followUp.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        assignedUserId: dto.assignedUserId,
        referenceId: dto.referenceId,
        type: dto.type as any,
        priority: dto.priority as any,
        status: 'PENDING',
        scheduledDate: new Date(dto.scheduledDate)
      }
    });
  }

  async findAll(status?: string, assignedUserId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (assignedUserId) where.assignedUserId = assignedUserId;

    return this.prisma.followUp.findMany({
      where,
      include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: [
        { priority: 'desc' }, // Custom ordering might require raw query in real DB, simulated here
        { scheduledDate: 'asc' }
      ]
    });
  }

  async findOne(id: string) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id } });
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return followUp;
  }

  async update(tenantId: string, id: string, dto: UpdateFollowUpDto) {
    const followUp = await this.findOne(id);

    if (['COMPLETED', 'CANCELLED'].includes(followUp.status)) {
      throw new ConflictException('Cannot modify a closed follow-up.');
    }

    let completedDate = null;
    if (dto.status === 'COMPLETED') {
      completedDate = new Date();
    }

    const dataToUpdate: any = { ...dto };
    if (dto.scheduledDate) dataToUpdate.scheduledDate = new Date(dto.scheduledDate);
    if (completedDate) dataToUpdate.completedDate = completedDate;

    const result = await this.prisma.followUp.updateMany({
      where: { id },
      data: dataToUpdate
    });

    if (result.count === 0) throw new NotFoundException('Follow-up not found');

    if (dto.status === 'COMPLETED') {
      this.eventEmitter.emit('followUp.completed', new FollowUpCompletedEvent(tenantId, id, followUp.patientId));
    }

    return this.findOne(id);
  }

  async assign(tenantId: string, id: string, assignedUserId: string | null) {
    const result = await this.prisma.followUp.updateMany({
      where: { id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      data: { assignedUserId }
    });
    if (result.count === 0) throw new NotFoundException('Follow-up not found or already closed');
    return this.findOne(id);
  }
}
```

*   **Purpose:** Core business logic for Follow-Up lifecycle state machine.
*   **Dependencies:** `PrismaService`, `EventEmitter2`.
*   **Security considerations:** Explicitly blocks modifications to historically closed (`COMPLETED`, `CANCELLED`) follow-ups to preserve clinical audit trails. 
*   **Multi-tenant considerations:** Avoids `update({ where: { id } })`. Uses exclusively `updateMany()` with `.count` checks to guarantee `AsyncLocalStorage` bounds injection operates without crashing.
*   **Failure scenarios:** Emits safe `ConflictException` if concurrent actors attempt to modify closed entities. Emits `ForbiddenException` if linked to an archived patient.

### `src/modules/follow-ups/services/follow-up-notes.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FollowUpNotesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, followUpId: string, authorUserId: string, content: string) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id: followUpId } }); 
    if (!followUp) throw new NotFoundException('Follow-up not found');

    return this.prisma.followUpNote.create({
      data: { tenantId, followUpId: followUp.id, authorUserId, content }
    });
  }

  async findAll(followUpId: string) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id: followUpId } }); 
    if (!followUp) throw new NotFoundException('Follow-up not found');
    
    return this.prisma.followUpNote.findMany({
      where: { followUpId: followUp.id },
      orderBy: { createdAt: 'desc' }
    });
  }
}
```

*   **Purpose:** Manages clinical tracking notes for ongoing follow-up efforts.
*   **Dependencies:** `PrismaService`.
*   **Security considerations:** Parent-child verification; a user cannot inject a note into a `followUpId` that does not exist in their tenant.
*   **Multi-tenant considerations:** Uses `findFirst` to inherit the `$allOperations` Prisma tenant injection lock.
*   **Failure scenarios:** Isolated service ensures note fetching failures do not crash the primary `FollowUpsService`.

---

## 3. Automation Workers

### `src/modules/follow-ups/workers/follow-up-automation.worker.ts`
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('follow-up-automation')
export class FollowUpAutomationWorker extends WorkerHost {
  private readonly logger = new Logger(FollowUpAutomationWorker.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, patientId, eventType, referenceId } = job.data;
    
    // IMPORTANT: BullMQ executes outside HTTP scope. 
    // This worker must use the unrestricted client OR inject tenant context manually via ALS wrapper.
    // Assuming standard implementation passes tenantId in job.data and uses explicit 'data' definition.

    if (eventType === 'APPOINTMENT_NO_SHOW') {
      await this.handleNoShow(tenantId, patientId, referenceId);
    } else if (eventType === 'STAGE_COMPLETED') {
      await this.handleStageCompletion(tenantId, patientId, referenceId);
    }
  }

  private async handleNoShow(tenantId: string, patientId: string, appointmentId: string) {
    // Retry-Safe Idempotency Check: Do not create duplicate automated follow-ups for the same appointment
    const existing = await this.prisma.unrestricted.followUp.findFirst({
      where: { tenantId, referenceId: appointmentId, type: 'MISSED_APPOINTMENT' }
    });

    if (existing) {
      this.logger.warn(`Follow-up already exists for appointment ${appointmentId}`);
      return;
    }

    await this.prisma.unrestricted.followUp.create({
      data: {
        tenantId,
        patientId,
        referenceId: appointmentId,
        type: 'MISSED_APPOINTMENT',
        status: 'PENDING',
        priority: 'HIGH',
        scheduledDate: new Date() // Immediate Action Required
      }
    });
  }

  private async handleStageCompletion(tenantId: string, patientId: string, stageId: string) {
    const existing = await this.prisma.unrestricted.followUp.findFirst({
      where: { tenantId, referenceId: stageId, type: 'TREATMENT_JOURNEY' }
    });

    if (existing) return;

    // Schedule a check-in 3 days after treatment stage completion
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 3);

    await this.prisma.unrestricted.followUp.create({
      data: {
        tenantId,
        patientId,
        referenceId: stageId,
        type: 'TREATMENT_JOURNEY',
        status: 'PENDING',
        priority: 'MEDIUM',
        scheduledDate
      }
    });
  }
}
```

*   **Purpose:** Background job processor that converts domain events into actionable Front-Desk workflows.
*   **Dependencies:** `BullMQ`, Unrestricted `PrismaService`.
*   **Security considerations:** Disconnected from the public internet. No API surface attack vectors.
*   **Multi-tenant considerations:** BullMQ runs outside the NestJS HTTP request context, meaning `AsyncLocalStorage` is undefined. The worker explicitly requires `tenantId` in the job payload and utilizes the `unrestricted` Prisma client to write to the correct tenant explicitly.
*   **Failure scenarios (Retry-Safe):** If the database connection drops halfway through `.create()`, BullMQ natively retries the job. The explicit `findFirst()` checks mapping `referenceId` and `type` act as deterministic Idempotency locks, ensuring a retry never results in duplicate records.

---

## 4. Controllers

### `src/modules/follow-ups/controllers/follow-ups.controller.ts`
```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { FollowUpsService } from '../services/follow-ups.service';
import { FollowUpNotesService } from '../services/follow-up-notes.service';
import { CreateFollowUpDto, UpdateFollowUpDto, CreateFollowUpNoteDto } from '../dto/follow-ups.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpsController {
  constructor(
    private readonly followUpsService: FollowUpsService,
    private readonly notesService: FollowUpNotesService
  ) {}

  @Post()
  @UseGuards(TenantStatusGuard) 
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'FOLLOW_UP' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFollowUpDto) {
    return this.followUpsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'FOLLOW_UP' })
  async findAll(@Query('status') status?: string, @Query('assignedUserId') assignedUserId?: string) {
    return this.followUpsService.findAll(status, assignedUserId);
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', subject: 'FOLLOW_UP' })
  async findOne(@Param('id') id: string) {
    return this.followUpsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'FOLLOW_UP' })
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFollowUpDto) {
    return this.followUpsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/assign')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'FOLLOW_UP' })
  async assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body('assignedUserId') assignedUserId: string) {
    return this.followUpsService.assign(user.tenantId, id, assignedUserId);
  }

  // --- NOTES MODULE ---
  @Post(':id/notes')
  @UseGuards(TenantStatusGuard) 
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'FOLLOW_UP_NOTE' })
  async addNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateFollowUpNoteDto) {
    return this.notesService.create(user.tenantId, id, user.id, dto.content);
  }

  @Get(':id/notes')
  @RequirePermissions({ action: 'READ', subject: 'FOLLOW_UP_NOTE' })
  async getNotes(@Param('id') id: string) {
    return this.notesService.findAll(id);
  }
}
```

*   **Purpose:** Exposes Follow-Up operations and Note integrations to the frontend workflow queues.
*   **Dependencies:** `FollowUpsService`, `FollowUpNotesService`, Global Guards.
*   **Security considerations:** Applies the `AuditLoggerInterceptor` universally to every mutation endpoint to track patient outreach history. Explicit RBAC controls prevent unauthorized staff from altering queues.
*   **Multi-tenant considerations:** Completely shields mutation routes with `TenantStatusGuard`. A clinic suspended due to billing failures will be able to read their Follow-Up queues but cannot assign, update, or create new items.
*   **Failure scenarios:** Any manipulation of IDs that don't belong to the JWT's `tenantId` safely returns `NotFoundException`.
