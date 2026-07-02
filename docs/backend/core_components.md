# Core Backend Components (Modules, Controllers, Services, DTOs)

This document defines the implementation strategy for the standard NestJS building blocks within DentalFlow.

---

## 1. Modules (`@Module`)

Modules in DentalFlow strictly follow the Domain-Driven Design (DDD) bounded contexts. They are used to encapsulate Controllers, Services, and related imports.

*   **Export Restrictions:** A module should only export services if absolutely necessary for another module to function synchronously. 
*   **Event-Driven Preference:** Instead of tightly coupling modules by exporting `TreatmentService` into `CommunicationModule`, we use the `@nestjs/event-emitter` to decouple them.

```typescript
// Example: src/modules/treatment/treatment.module.ts
@Module({
  imports: [PrismaModule], // Core DB module
  controllers: [TreatmentJourneyController, PatientController],
  providers: [TreatmentJourneyService, PatientService],
})
export class TreatmentModule {}
```

---

## 2. Controllers (`@Controller`)

Controllers in DentalFlow are intentionally kept thin. Their sole responsibilities are:
1. Handling the HTTP routing map.
2. Parsing request payloads via decorators (`@Body`, `@Param`, `@Query`).
3. Extracting the tenant context and authenticated user via custom decorators (`@CurrentTenant()`, `@CurrentUser()`).
4. Delegating the actual work to a Service.
5. Returning the appropriate HTTP Status Code.

### Controller Structure Rule
No business logic (e.g., calculating remaining balances, deciding if a stage can be completed) is allowed in a controller.

```typescript
// Example Implementation Strategy
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  async createPatient(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientService.create(tenantId, dto);
  }
}
```

---

## 3. Services (`@Injectable`)

Services contain 100% of the business logic. 

### Database Access
All database access happens inside Services using the injected `PrismaService`. To adhere to our multi-tenant architecture, **every single Prisma call must include `tenantId` in its `where` clause** or utilize an extended Prisma client that enforces RLS.

### Transactional Boundaries
When an operation mutates multiple tables (e.g., Completing a Stage + Logging a Payment + Firing an Event + Creating an Audit Log), it must be wrapped in a Prisma Interactive Transaction.

```typescript
// Example Strategy for Services
@Injectable()
export class TreatmentJourneyService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async completeStage(tenantId: string, stageId: string, dto: CompleteStageDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update the stage
      const stage = await tx.treatmentStage.update({
        where: { id: stageId, tenantId },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
      
      // 2. Insert Audit Log
      await tx.auditLog.create({ /* ... */ });
      
      // 3. Emit Domain Event for the Communication Module to pick up
      this.eventEmitter.emit('stage.completed', new StageCompletedEvent(stage));
      
      return stage;
    });
  }
}
```

---

## 4. Data Transfer Objects (DTOs)

DTOs form the security perimeter of the API. We strictly utilize `class-validator` and `class-transformer` to ensure no malformed data reaches the Services.

### DTO Rules
1. **Whitelisting:** All incoming payloads are strictly filtered. Unknown properties sent by a client are stripped automatically (configured via global `ValidationPipe`).
2. **Type Safety:** `@Type()` from `class-transformer` must be used for nested objects or converting strings to Dates/Numbers.

```typescript
// Example DTO Strategy
import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsPhoneNumber('IN') // Strictly validates Indian mobile format
  phoneNumber: string;

  @IsBoolean()
  @IsOptional()
  whatsappOptIn?: boolean;
}
```
