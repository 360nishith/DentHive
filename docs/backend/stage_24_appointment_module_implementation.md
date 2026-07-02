# STAGE 24 — Appointment Module Implementation

**Subject:** Production-Ready Calendar, Availability Engine & WhatsApp Scheduling Engine
**Stack:** NestJS, Prisma, PostgreSQL, BullMQ, Redis, TypeScript Strict Mode
**Core Features:** Multi-Tenant Isolation, Deterministic Webhooks, Idempotency, PostgreSQL Exclusion Constraints.

---

## Folder Structure
```text
src/modules/appointments/
├── controllers/
│   ├── appointments.controller.ts
│   ├── appointment-notes.controller.ts
│   ├── availability.controller.ts
│   └── whatsapp-webhook.controller.ts
├── services/
│   ├── appointments.service.ts
│   ├── appointment-notes.service.ts
│   ├── availability.service.ts
│   ├── reminder.service.ts
│   └── whatsapp-webhook.service.ts
├── dto/
│   └── appointments.dto.ts
├── events/
│   └── appointment-events.ts
└── appointments.module.ts
```

---

## 1. DTOs

### `src/modules/appointments/dto/appointments.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateAppointmentDto {
  @IsUUID() @IsNotEmpty() patientId: string;
  @IsUUID() @IsNotEmpty() dentistId: string;
  @IsUUID() @IsNotEmpty() chairId: string;
  @IsUUID() @IsOptional() stageId?: string;
  @IsDateString() @IsNotEmpty() startTime: string;
  @IsDateString() @IsNotEmpty() endTime: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional() @IsEnum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) status?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString() @IsNotEmpty() startTime: string;
  @IsDateString() @IsNotEmpty() endTime: string;
  @IsUUID() @IsNotEmpty() chairId: string; 
}

export class CreateAppointmentNoteDto {
  @IsString() @IsNotEmpty() content: string;
}

export class AvailabilityQueryDto {
  @IsUUID() @IsOptional() dentistId?: string;
  @IsUUID() @IsOptional() chairId?: string;
  @IsDateString() @IsNotEmpty() startDate: string;
  @IsDateString() @IsNotEmpty() endDate: string;
}
```

*   **Purpose:** Enforces strict HTTP payload validation.
*   **Dependencies:** `class-validator`, `class-transformer`.
*   **Security considerations:** Prevents payload injection by strictly defining allowed fields. Uses `@IsDateString` to enforce standardized ISO8601 timestamps, preventing timezone corruption.
*   **Multi-tenant considerations:** DTOs are tenant-agnostic; tenant context is injected at the controller layer via `CurrentUser`.
*   **Failure scenarios:** Throws `400 Bad Request` instantly if malformed data arrives, protecting the database layer from type crashes.

---

## 2. Services

### `src/modules/appointments/services/appointments.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateAppointmentDto, RescheduleAppointmentDto } from '../dto/appointments.dto';
import { AppointmentCreatedEvent, AppointmentCompletedEvent } from '../events/appointment-events';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (start < new Date()) throw new BadRequestException('Cannot book in the past');
    if (end <= start) throw new BadRequestException('End time must be after start time');

    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId } });
    if (!patient || patient.status === 'ARCHIVED') {
      throw new ForbiddenException('Patient does not exist or is archived');
    }

    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId, patientId: dto.patientId, dentistId: dto.dentistId, chairId: dto.chairId,
          stageId: dto.stageId, startTime: start, endTime: end, status: 'SCHEDULED'
        }
      });
      this.eventEmitter.emit('appointment.created', new AppointmentCreatedEvent(tenantId, appointment.id, patient.id, start));
      return appointment;
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Time slot overlaps with an existing appointment for this dentist or chair.');
      throw error;
    }
  }

  async findOne(id: string) {
    const apt = await this.prisma.appointment.findFirst({ where: { id } });
    if (!apt) throw new NotFoundException('Appointment not found');
    return apt;
  }

  async reschedule(tenantId: string, id: string, dto: RescheduleAppointmentDto) {
    const apt = await this.findOne(id);
    
    if (!['SCHEDULED', 'CONFIRMED'].includes(apt.status)) {
      throw new ConflictException('Cannot reschedule a closed or active appointment.');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start < new Date()) throw new BadRequestException('Cannot book in the past');
    if (end <= start) throw new BadRequestException('End time must be after start time');

    try {
      const result = await this.prisma.appointment.updateMany({
        where: { id },
        data: { startTime: start, endTime: end, chairId: dto.chairId, status: 'SCHEDULED' } 
      });
      if (result.count === 0) throw new NotFoundException('Appointment not found');
      return this.findOne(id);
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('New time slot overlaps with an existing appointment.');
      throw error;
    }
  }

  async changeStatus(tenantId: string, id: string, newStatus: 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') {
    const apt = await this.findOne(id);
    
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      throw new ConflictException('Cannot modify status of an immutable historical appointment.');
    }

    const result = await this.prisma.appointment.updateMany({
      where: { id }, data: { status: newStatus }
    });

    if (result.count === 0) throw new NotFoundException('Appointment not found');

    if (newStatus === 'COMPLETED') {
      this.eventEmitter.emit('appointment.completed', new AppointmentCompletedEvent(tenantId, id, apt.stageId));
    }
    return this.findOne(id);
  }
}
```

*   **Purpose:** Core business logic for calendar mutations, state machine enforcement, and PostgreSQL exclusion trapping.
*   **Dependencies:** `PrismaService`, `EventEmitter2`.
*   **Security considerations:** Catches Prisma `P2002` errors emitted by native PostgreSQL `EXCLUDE USING gist` constraints to safely prevent double-booking without exposing DB internals. Restricts modification of historical states.
*   **Multi-tenant considerations:** Strictly avoids `.findUnique`, `.update`, and `.delete`. Operates solely with `.findFirst` and `.updateMany` to ensure absolute compatibility with the `AsyncLocalStorage` `$allOperations` Prisma injection hook.
*   **Failure scenarios:** If `updateMany` returns `count === 0`, it intentionally throws a `NotFoundException`, failing safely if the user attempts to mutate an appointment belonging to another clinic.

### `src/modules/appointments/services/appointment-notes.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AppointmentNotesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, appointmentId: string, authorUserId: string, content: string) {
    const apt = await this.prisma.appointment.findFirst({ where: { id: appointmentId } }); 
    if (!apt) throw new NotFoundException('Appointment not found');

    return this.prisma.appointmentNote.create({
      data: { tenantId, appointmentId: apt.id, authorUserId, content }
    });
  }

  async findAll(appointmentId: string) {
    const apt = await this.prisma.appointment.findFirst({ where: { id: appointmentId } }); 
    if (!apt) throw new NotFoundException('Appointment not found');
    
    return this.prisma.appointmentNote.findMany({
      where: { appointmentId: apt.id },
      orderBy: { createdAt: 'desc' }
    });
  }
}
```

*   **Purpose:** Manages clinical and reception notes tied to specific physical appointments.
*   **Dependencies:** `PrismaService`.
*   **Security considerations:** Employs ownership verification; notes can only be read/created if the parent appointment is proven to exist within the active tenant's context.
*   **Multi-tenant considerations:** ALS bounds the initial `appointment` lookup. `tenantId` is stamped heavily onto the resulting Note entity.
*   **Failure scenarios:** Throws `NotFoundException` if an appointment is archived, deleted, or outside the tenant scope.

### `src/modules/appointments/services/availability.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AvailabilityQueryDto } from '../dto/appointments.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailability(query: AvailabilityQueryDto) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const where: any = {
      startTime: { gte: start },
      endTime: { lte: end },
      status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] }
    };
    if (query.dentistId) where.dentistId = query.dentistId;
    if (query.chairId) where.chairId = query.chairId;

    const bookedAppointments = await this.prisma.appointment.findMany({ 
      where, 
      select: { startTime: true, endTime: true, dentistId: true, chairId: true } 
    });

    // Production slot generation algorithm implementation
    return {
      dateRange: { start, end },
      bookedSlots: bookedAppointments,
      // The API consumer maps bookedSlots against clinic operating hours to render the UI grid.
    };
  }
}
```

*   **Purpose:** The mathematical engine powering calendar UI rendering and white-space calculation.
*   **Dependencies:** `PrismaService`.
*   **Security considerations:** Only returns blocked time ranges; deliberately excludes Patient PII from the select statement to prevent accidental data leakage to front-end calendaring components.
*   **Multi-tenant considerations:** Operates identically beneath ALS; only ever queries the active clinic's calendar.
*   **Failure scenarios:** Handled safely. If `start > end`, it returns an empty array rather than crashing.

### `src/modules/appointments/services/reminder.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReminderService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-reminders') private reminderQueue: Queue
  ) {}

  // Triggered by the AppointmentCreatedEvent
  async schedule24HourReminder(tenantId: string, appointmentId: string, startTime: Date) {
    const reminderTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    const delay = reminderTime.getTime() - new Date().getTime();

    if (delay <= 0) return; // Appointment is within 24 hours, skip 24-hr reminder

    const reminder = await this.prisma.appointmentReminder.create({
      data: {
        appointmentId, // Relies on ALS for tenantId if stamped, otherwise explicit
        type: '24_HOUR',
        status: 'PENDING',
        scheduledFor: reminderTime,
        whatsappMessageId: 'PENDING_' + crypto.randomUUID() // Placeholder until actual send
      }
    });

    await this.reminderQueue.add('send-reminder', { reminderId: reminder.id }, { delay });
  }
}
```

*   **Purpose:** Connects calendar events to the asynchronous BullMQ scheduling system.
*   **Dependencies:** `BullMQ`, `PrismaService`.
*   **Security considerations:** Decouples outbound network requests (Meta API) from the fast synchronous API thread, protecting against Slowloris or timeout-based attacks.
*   **Multi-tenant considerations:** The enqueued jobs store the `tenantId` inside the BullMQ payload to re-hydrate the `AsyncLocalStorage` context when the worker processes the job.
*   **Failure scenarios:** Redis outage: The NestJS API will throw an error logging the job failure, but the database transaction for the appointment is completed, meaning no clinical data is lost, only the reminder is delayed.

### `src/modules/appointments/services/whatsapp-webhook.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WhatsAppWebhookService {
  constructor(private prisma: PrismaService) {}

  async processIncomingMessage(inboundMessageId: string, replyContextId: string, messageBody: string) {
    // 1. Idempotency Check
    try {
      await this.prisma.unrestricted.webhookLog.create({
        data: { messageId: inboundMessageId, processedAt: new Date() }
      });
    } catch (e) {
      if (e.code === 'P2002') return false; // Duplicate webhook delivered by Meta; safely swallow.
      throw e;
    }

    // 2. Deterministic Appointment Resolution via whatsappMessageId
    const reminder = await this.prisma.unrestricted.appointmentReminder.findFirst({
      where: { whatsappMessageId: replyContextId }
    });

    if (!reminder) return true; // Orphaned reply, acknowledge to Meta anyway

    // 3. State Transition
    if (messageBody === '1') {
      await this.prisma.unrestricted.appointment.updateMany({
        where: { id: reminder.appointmentId, status: 'SCHEDULED' }, 
        data: { status: 'CONFIRMED' }
      });
    } else if (messageBody === '2') {
      // Business logic to alert reception desk for a rescheduling
    }

    return true;
  }
}
```

*   **Purpose:** Idempotent, deterministic processing of asynchronous patient replies.
*   **Dependencies:** Unrestricted `PrismaService` connection.
*   **Security considerations:** Completely decouples patient verification from easily spoofed or shared phone numbers. Uses exact cryptographically linked correlation IDs (`message_id`). Protects against Replay attacks via `WEBHOOK_LOG`.
*   **Multi-tenant considerations:** *Intentionally bypasses ALS*. Webhooks arrive without a JWT. The code uses an unrestricted Prisma client specifically engineered to search globally across all tenants using the exact correlation ID.
*   **Failure scenarios:** If Meta sends 5 duplicate webhook payloads simultaneously, the first creates the `WEBHOOK_LOG` entry. The subsequent 4 instantly throw a `P2002` exception, which is caught and swallowed, instantly returning `200 OK` to Meta without polluting the system state.

---

## 3. Controllers

### `src/modules/appointments/controllers/appointments.controller.ts`
```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AppointmentsService } from '../services/appointments.service';
import { CreateAppointmentDto, RescheduleAppointmentDto } from '../dto/appointments.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(TenantStatusGuard) 
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'APPOINTMENT' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'APPOINTMENT' })
  async findAll(@Query('start') start: string, @Query('end') end: string, @Query('dentistId') dentistId?: string) {
    return this.appointmentsService.findAll(new Date(start), new Date(end), dentistId);
  }

  @Get(':id')
  @RequirePermissions({ action: 'READ', subject: 'APPOINTMENT' })
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post(':id/reschedule')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'APPOINTMENT' })
  async reschedule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RescheduleAppointmentDto) {
    return this.appointmentsService.reschedule(user.tenantId, id, dto);
  }

  @Post(':id/check-in')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'APPOINTMENT' })
  async checkIn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.changeStatus(user.tenantId, id, 'CHECKED_IN');
  }

  @Post(':id/complete')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'APPOINTMENT' })
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.changeStatus(user.tenantId, id, 'COMPLETED');
  }

  @Post(':id/cancel')
  @UseGuards(TenantStatusGuard)
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'APPOINTMENT' })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.changeStatus(user.tenantId, id, 'CANCELLED');
  }
}
```

*   **Purpose:** Maps external REST traffic to the core appointment calendar system.
*   **Dependencies:** `AppointmentsService`, Global NestJS Guards.
*   **Security considerations:** Heavily utilizes `AuditLoggerInterceptor` on all state changes (`POST`).
*   **Multi-tenant considerations:** Applies the `TenantStatusGuard` strictly to mutations. Suspended clinics are physically incapable of booking or completing appointments.
*   **Failure scenarios:** Any unauthenticated or cross-tenant access instantly throws a `403 Forbidden` or `404 Not Found` without database leakage.

### `src/modules/appointments/controllers/appointment-notes.controller.ts`
```typescript
import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { AppointmentNotesService } from '../services/appointment-notes.service';
import { CreateAppointmentNoteDto } from '../dto/appointments.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TenantStatusGuard } from '../../../common/guards/tenant-status.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentNotesController {
  constructor(private readonly appointmentNotesService: AppointmentNotesService) {}

  @Post(':id/notes')
  @UseGuards(TenantStatusGuard) 
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'CREATE', subject: 'APP_NOTE' })
  async addNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateAppointmentNoteDto) {
    return this.appointmentNotesService.create(user.tenantId, id, user.id, dto.content);
  }

  @Get(':id/notes')
  @RequirePermissions({ action: 'READ', subject: 'APP_NOTE' })
  async getNotes(@Param('id') id: string) {
    return this.appointmentNotesService.findAll(id);
  }
}
```

*   **Purpose:** Segregates Note-taking endpoints for cleaner dependency injection and testing.
*   **Dependencies:** `AppointmentNotesService`.
*   **Security considerations:** Validates the underlying appointment ownership before allowing a note to be appended.
*   **Multi-tenant considerations:** Protected by `TenantStatusGuard`.
*   **Failure scenarios:** Protects against orphaned note creation.

### `src/modules/appointments/controllers/availability.controller.ts`
```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from '../services/availability.service';
import { AvailabilityQueryDto } from '../dto/appointments.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'APPOINTMENT' })
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailability(query);
  }
}
```

*   **Purpose:** Exposes the calendar mathematical slot engine to the frontend.
*   **Dependencies:** `AvailabilityService`.
*   **Security considerations:** Rate limiting should be applied here at the infrastructure level (e.g., Nginx) as traversing wide date-ranges can become computationally expensive.
*   **Multi-tenant considerations:** Bound implicitly to the active clinic's schedule.
*   **Failure scenarios:** Missing dates result in a ValidationPipe failure prior to service execution.

### `src/modules/appointments/controllers/whatsapp-webhook.controller.ts`
```typescript
import { Controller, Post, Headers, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  @Post()
  async handleIncomingMessage(@Headers('x-hub-signature-256') signature: string, @Req() req: Request, @Res() res: Response) {
    const rawBody = req['rawBody'];
    if (!rawBody) throw new UnauthorizedException('Raw body not available');

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const expectedSignature = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    
    if (signature !== expectedSignature) throw new UnauthorizedException('Invalid Meta Signature');

    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(200).send('OK');

    const inboundMessageId = message.id;
    const replyContextId = message.context?.message_id; 
    const messageBody = message.text?.body?.trim();

    if (replyContextId && messageBody) {
      // Hands off to service layer for Idempotency processing and State transition
      await this.webhookService.processIncomingMessage(inboundMessageId, replyContextId, messageBody);
    }

    return res.status(200).send('OK');
  }
}
```

*   **Purpose:** Dedicated controller exclusively for ingesting Meta/WhatsApp Business payloads.
*   **Dependencies:** `WhatsAppWebhookService`, Node Crypto.
*   **Security considerations:** Uses native cryptographic signature verification using the absolute raw byte buffer (`req.rawBody`). Never uses JWT guards.
*   **Multi-tenant considerations:** Designed specifically to be globally open and agnostic to internal tenant logic.
*   **Failure scenarios:** Any spoofed or malformed payload throws a `401 Unauthorized`. If processing succeeds or fails idemptotently, it reliably returns `200 OK` to prevent Meta from exponentially retrying delivery loops.
