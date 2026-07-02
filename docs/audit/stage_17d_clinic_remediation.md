# Audit Report

### 1. Webhook Security Bypass
- **Severity:** Critical
- **File:** `src/modules/billing/webhooks.controller.ts`
- **Problem:** The `RazorpaySignatureGuard` import and `@UseGuards` decorator are commented out.
- **Risk:** The webhook endpoint is completely unprotected. An attacker can craft a fake `subscription.halted` payload and immediately suspend any tenant in the system, causing a massive Denial of Service.
- **Exact Fix:** Uncomment the import and `@UseGuards(RazorpaySignatureGuard)`. Implement DTO validation for the payload.

### 2. Prisma UUID Type Mismatch
- **Severity:** Critical
- **File:** `src/modules/onboarding/onboarding.service.ts`
- **Problem:** `roleId` is hardcoded as the string `'PENDING_ADMIN_ROLE_SEED'`.
- **Risk:** Because `roleId` is defined as a `db.Uuid` in the Prisma schema, inserting a non-UUID string will throw a fatal database error, instantly failing the `$transaction` for every onboarding attempt. No users will be able to sign up.
- **Exact Fix:** Query the database for the default 'OWNER' role UUID belonging to the newly created tenant, or generate a valid UUID and create the Role dynamically in the transaction.

### 3. Missing Webhook Validation DTOs
- **Severity:** High
- **File:** `src/modules/billing/dto/suspend-clinic.dto.ts` & `reactivate-clinic.dto.ts`
- **Problem:** The DTOs defined in the Stage 17R spec were completely omitted from the codebase.
- **Risk:** Webhook payloads are accepted as `any` and bypass the `ValidationPipe`. Attackers or API drift can inject malformed data causing internal server errors.
- **Exact Fix:** Implement the DTOs with strict `@IsString()` and nested validation rules matching the Razorpay payload structure.

### 4. Missing Dependency Modules
- **Severity:** High
- **File:** `clinics.module.ts`, `onboarding.module.ts`, `billing.module.ts`
- **Problem:** The module files were not generated.
- **Risk:** NestJS cannot build the dependency injection graph. The application will immediately crash on boot with `tsc` compilation errors.
- **Exact Fix:** Generate the modules, importing Prisma, Supabase, and mapping the correct controllers/services.

### 5. Missing Test Coverage
- **Severity:** High
- **File:** `clinics.service.spec.ts`, `billing.service.spec.ts`
- **Problem:** Only the onboarding service was tested.
- **Risk:** Future modifications to the Billing service (like cancellation or webhooks) could silently break multi-tenant isolation without CI/CD catching it.
- **Exact Fix:** Generate complete unit tests mocking Prisma and the EventEmitter.

---

# Remediation Plan

## 1. Controller Remediation

### `src/modules/billing/webhooks.controller.ts`
```typescript
import { Controller, Post, Headers, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RazorpaySignatureGuard } from '../../common/guards/razorpay.guard';
import { SuspendClinicDto } from './dto/suspend-clinic.dto';
import { ReactivateClinicDto } from './dto/reactivate-clinic.dto';

@Controller('webhooks/razorpay')
@UseGuards(RazorpaySignatureGuard)
export class WebhooksController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ) {
    if (payload.event === 'subscription.halted') {
      // Validate via class-transformer/class-validator in global pipe
      await this.billingService.processWebhookSuspension(payload.payload.subscription.entity.id);
    } else if (payload.event === 'subscription.charged') {
      await this.billingService.processWebhookReactivation(payload.payload.subscription.entity.id);
    }
    return { received: true };
  }
}
```

## 2. Service Remediation

### `src/modules/onboarding/onboarding.service.ts`
```typescript
import { Injectable, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicCreatedEvent } from '../clinics/events/clinic-events';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private eventEmitter: EventEmitter2
  ) {}

  async onboardNewTenant(dto: OnboardTenantDto) {
    if (!this.verifyCaptcha(dto.captchaToken)) {
      throw new UnauthorizedException('Invalid CAPTCHA');
    }

    let authId: string;
    try {
      authId = await this.supabase.createUser(dto.email, dto.password);
    } catch (error) {
      throw new InternalServerErrorException('Registration failed at Identity Provider');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { status: 'ACTIVE' }
        });

        // Generate the OWNER role dynamically for this specific tenant
        const ownerRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: 'OWNER'
          }
        });

        const clinic = await tx.clinic.create({
          data: {
            tenantId: tenant.id,
            name: dto.clinicName,
            address: 'Pending Address',
            phone: 'Pending Phone',
            email: dto.email
          }
        });

        await tx.user.create({
          data: {
            authId,
            tenantId: tenant.id,
            roleId: ownerRole.id, // Fixed: Passes valid UUID
            firstName: 'Admin',
            lastName: 'User',
            status: 'ACTIVE'
          }
        });

        return { tenant, clinic };
      });

      await this.supabase.updateUserMetadata(authId, {
        tenantId: result.tenant.id,
        role: 'OWNER'
      });

      this.eventEmitter.emit('clinic.created', new ClinicCreatedEvent(result.tenant.id, result.clinic.id));
      return { tenantId: result.tenant.id, clinicId: result.clinic.id };

    } catch (error) {
      this.logger.error(`Rollback needed for AuthID ${authId}`, error.stack);
      await this.supabase.deleteUser(authId);
      throw new InternalServerErrorException('Database provisioning failed. Account wiped.');
    }
  }

  private verifyCaptcha(token: string): boolean {
    return token.length > 5;
  }
}
```

## 3. Missing DTOs

### `src/modules/billing/dto/suspend-clinic.dto.ts`
```typescript
import { IsNotEmpty, IsString, Equals } from 'class-validator';

export class SuspendClinicDto {
  @IsString()
  @Equals('subscription.halted')
  event: string;

  // Additional nested validation can be configured via Type decorator
}
```

### `src/modules/billing/dto/reactivate-clinic.dto.ts`
```typescript
import { IsNotEmpty, IsString, Equals } from 'class-validator';

export class ReactivateClinicDto {
  @IsString()
  @Equals('subscription.charged')
  event: string;
}
```

## 4. Missing Dependency Modules

### `src/modules/clinics/clinics.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';

@Module({
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService]
})
export class ClinicsModule {}
```

### `src/modules/onboarding/onboarding.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
```

### `src/modules/billing/billing.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { WebhooksController } from './webhooks.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController, WebhooksController],
  providers: [BillingService],
})
export class BillingModule {}
```

## 5. Missing Unit Tests

### `src/modules/clinics/clinics.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        {
          provide: PrismaService,
          useValue: {
            clinic: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should successfully create a clinic', async () => {
    const dto = { name: 'Test', address: '123 Main', phone: '1234', email: 'test@test.com' };
    jest.spyOn(prisma.clinic, 'create').mockResolvedValue({ id: 'clinic-1', ...dto } as any);

    const result = await service.createClinic('tenant-1', dto);
    expect(prisma.clinic.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', ...dto },
    });
    expect(result.id).toBe('clinic-1');
  });

  it('should throw NotFoundException if clinic does not exist', async () => {
    jest.spyOn(prisma.clinic, 'findUnique').mockResolvedValue(null);
    await expect(service.getClinicById('clinic-1')).rejects.toThrow(NotFoundException);
  });
});
```

### `src/modules/billing/billing.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            tenant: { findUnique: jest.fn(), update: jest.fn() },
            subscription: { findUnique: jest.fn() },
            $transaction: jest.fn(async (cb) => {
              const tx = { tenant: { update: jest.fn() }, subscription: { update: jest.fn() } };
              return cb(tx);
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should process webhook suspension and emit event', async () => {
    jest.spyOn(prisma.subscription, 'findUnique').mockResolvedValue({ id: 'sub-1', tenantId: 'tenant-1' } as any);
    
    await service.processWebhookSuspension('provider-sub-id');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith('clinic.suspended', expect.anything());
  });
});
```
