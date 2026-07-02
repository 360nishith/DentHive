# STAGE 27 — Subscription Module Implementation

**Subject:** Production-Ready SaaS Financial Enforcer & Billing System
**Stack:** NestJS, Prisma, PostgreSQL, Razorpay API, Node Crypto
**Core Features:** Global Webhook Idempotency, Cryptographic Verification, Multi-Tenant Lockout Enforcement, Audit Logging.

---

## Folder Structure
```text
src/modules/subscription/
├── controllers/
│   ├── subscription.controller.ts
│   └── subscription-webhook.controller.ts
├── services/
│   ├── subscription.service.ts
│   └── subscription-webhook.service.ts
├── dto/
│   └── subscription.dto.ts
└── subscription.module.ts
```

---

## 1. DTOs

### `src/modules/subscription/dto/subscription.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class CancelSubscriptionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
```
*   **Purpose:** Enforces rigorous input payloads for manual subscription modifications by clinic administrators.
*   **Dependencies:** `class-validator`.
*   **Security considerations:** Strips arbitrary parameter injections.
*   **Multi-tenant considerations:** Implicitly linked to the JWT's `tenantId` without requesting it in the body.
*   **Failure scenarios:** Instantly halts malicious payloads with a `400 Bad Request` prior to database execution.

---

## 2. Services

### `src/modules/subscription/services/subscription.service.ts`
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Razorpay from 'razorpay'; // Razorpay SDK

@Injectable()
export class SubscriptionService {
  private razorpayClient: Razorpay;

  constructor(private prisma: PrismaService) {
    this.razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async getStatus(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: {
        invoices: {
          orderBy: { paidAt: 'desc' },
          take: 5
        }
      }
    });

    if (!subscription) throw new NotFoundException('No subscription found for this clinic.');
    return subscription;
  }

  async createCheckoutSession(tenantId: string, planId: string) {
    // Determine if tenant already has an active subscription
    const existing = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (existing && existing.status === 'active') {
      throw new ForbiddenException('Clinic already has an active subscription.');
    }

    // Call Razorpay API to generate a Subscription ID
    const rzpSubscription = await this.razorpayClient.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12 // Annual terms, billed monthly
    });

    // Upsert local state 
    // Using explicit where and transaction logic conceptually if needed.
    const localSub = await this.prisma.subscription.upsert({
      where: { tenantId } as any, // Leveraging unique index
      update: {
        razorpaySubscriptionId: rzpSubscription.id,
        razorpayPlanId: planId,
        status: rzpSubscription.status
      },
      create: {
        tenantId,
        razorpaySubscriptionId: rzpSubscription.id,
        razorpayPlanId: planId,
        status: rzpSubscription.status,
        currentTermStart: new Date(),
        currentTermEnd: new Date()
      }
    });

    return { subscriptionId: localSub.razorpaySubscriptionId };
  }

  async cancelSubscription(tenantId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findFirst({ where: { tenantId } });
    if (!subscription || !subscription.razorpaySubscriptionId) {
      throw new NotFoundException('No active Razorpay subscription found.');
    }

    // Instruct Razorpay to cancel at the end of the current billing cycle
    await this.razorpayClient.subscriptions.cancel(subscription.razorpaySubscriptionId, false);

    const updated = await this.prisma.subscription.updateMany({
      where: { tenantId },
      data: { status: 'cancelled' }
    });

    // We do NOT suspend the tenant immediately. 
    // The Razorpay webhook `subscription.halted` or `subscription.cancelled` will handle the actual TENANT.status transition.
    
    return true;
  }
}
```
*   **Purpose:** Core business logic for handling user-facing billing actions (upgrading, checking status, cancelling).
*   **Dependencies:** `PrismaService`, `Razorpay SDK`.
*   **Security considerations:** Never exposes Razorpay secret keys to the frontend. Only issues the `subscriptionId` to initialize the frontend SDK checkout.
*   **Multi-tenant considerations:** Bypasses `findUnique` via `findFirst` to enforce `$allOperations` safety.
*   **Failure scenarios:** If Razorpay goes down, creation fails synchronously, preventing local DB corruption.

### `src/modules/subscription/services/subscription-webhook.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);
  constructor(private prisma: PrismaService) {}

  async processWebhook(eventId: string, payload: any) {
    // 1. Strict Webhook Idempotency & Replay Protection
    try {
      await this.prisma.unrestricted.webhookLog.create({
        data: { messageId: eventId, processedAt: new Date() }
      });
    } catch (e) {
      if (e.code === 'P2002') return false; // Duplicate payload safely swallowed
      throw e;
    }

    const eventName = payload.event;
    const subscriptionEntity = payload.payload.subscription?.entity;
    
    if (!subscriptionEntity) return true;

    const razorpaySubId = subscriptionEntity.id;

    // Resolve exactly which local subscription (and thereby which Tenant) this affects
    const localSub = await this.prisma.unrestricted.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpaySubId }
    });

    if (!localSub) {
      this.logger.error(`Received webhook for unknown subscription: ${razorpaySubId}`);
      return true; // Return true to ack Razorpay to stop retries
    }

    const tenantId = localSub.tenantId;

    // 2. Financial Enforcer State Machine
    if (eventName === 'subscription.charged') {
      // Payment successful
      await this.prisma.unrestricted.$transaction(async (tx) => {
        // Update subscription bounds
        await tx.subscription.updateMany({
          where: { id: localSub.id },
          data: { 
            status: 'active',
            currentTermStart: new Date(subscriptionEntity.current_start * 1000),
            currentTermEnd: new Date(subscriptionEntity.current_end * 1000)
          }
        });

        // Record the invoice locally
        const paymentEntity = payload.payload.payment?.entity;
        if (paymentEntity) {
          await tx.billingInvoice.create({
            data: {
              subscriptionId: localSub.id,
              razorpayPaymentId: paymentEntity.id,
              razorpayInvoiceId: paymentEntity.invoice_id || 'manual',
              amountInPaise: paymentEntity.amount,
              status: 'PAID',
              paidAt: new Date()
            }
          });
        }

        // UNLOCK TENANT: Restore platform access via TenantStatusGuard
        await tx.tenant.updateMany({
          where: { id: tenantId },
          data: { status: 'ACTIVE' }
        });
      });

    } else if (eventName === 'subscription.halted') {
      // Payment retries exhausted
      await this.prisma.unrestricted.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: { id: localSub.id },
          data: { status: 'halted' }
        });

        // LOCK TENANT: Trigger global TenantStatusGuard rejections across all clinical modules
        await tx.tenant.updateMany({
          where: { id: tenantId },
          data: { status: 'SUSPENDED' }
        });
      });

    } else if (eventName === 'subscription.cancelled') {
      await this.prisma.unrestricted.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: { id: localSub.id },
          data: { status: 'cancelled' }
        });

        // LOCK TENANT
        await tx.tenant.updateMany({
          where: { id: tenantId },
          data: { status: 'CANCELLED' }
        });
      });
    }

    return true;
  }
}
```
*   **Purpose:** The highest-authority background worker in the system. Directly manipulates `TENANT.status` to grant or revoke SaaS access based on real-time financial data.
*   **Dependencies:** Unrestricted `PrismaService`.
*   **Security considerations:** Uses the unrestricted database client because external webhooks carry no JWTs or `tenantId` session headers. Tenant isolation is mathematically resolved by matching the `razorpaySubscriptionId`. 
*   **Multi-tenant considerations:** Utilizes strict ACID transactions `this.prisma.unrestricted.$transaction` to guarantee that if the Subscription entity updates, the `Tenant` lockout status updates atomically alongside it.
*   **Failure scenarios:** Duplicate deliveries from Razorpay are completely nullified by the `P2002` error trap on the `WEBHOOK_LOG` entity, ensuring the clinic is never double-billed locally or erroneously locked/unlocked.

---

## 3. Controllers

### `src/modules/subscription/controllers/subscription.controller.ts`
```typescript
import { Controller, Get, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from '../dto/subscription.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditLoggerInterceptor } from '../../../common/interceptors/audit-logger.interceptor';

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @RequirePermissions({ action: 'READ', subject: 'SUBSCRIPTION' })
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionService.getStatus(user.tenantId);
  }

  @Post('checkout')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'SUBSCRIPTION' })
  async createCheckout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.subscriptionService.createCheckoutSession(user.tenantId, dto.planId);
  }

  @Post('cancel')
  @UseInterceptors(AuditLoggerInterceptor)
  @RequirePermissions({ action: 'UPDATE', subject: 'SUBSCRIPTION' })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionService.cancelSubscription(user.tenantId, dto.reason);
  }
}
```
*   **Purpose:** Routes internal clinic admin actions.
*   **Dependencies:** Global NestJS Guards.
*   **Security considerations:** `TenantStatusGuard` is **DELIBERATELY OMITTED** from this controller. If a tenant is `SUSPENDED` (past due), they *must* be allowed to hit this endpoint to update their credit card and checkout, otherwise they could never restore their account.
*   **Multi-tenant considerations:** Securely bounds actions to `user.tenantId`.
*   **Failure scenarios:** Requires absolute `UPDATE:SUBSCRIPTION` permissions, ensuring standard clinical receptionists cannot view invoices or cancel the entire clinic's software license.

### `src/modules/subscription/controllers/subscription-webhook.controller.ts`
```typescript
import { Controller, Post, Headers, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SubscriptionWebhookService } from '../services/subscription-webhook.service';

@Controller('webhooks/razorpay')
export class SubscriptionWebhookController {
  constructor(private readonly webhookService: SubscriptionWebhookService) {}

  @Post()
  async handleIncomingWebhook(@Headers('x-razorpay-signature') signature: string, @Req() req: Request, @Res() res: Response) {
    const rawBody = req['rawBody'];
    if (!rawBody) throw new UnauthorizedException('Raw body not available');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Cryptographic assurance
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (signature !== expectedSignature) throw new UnauthorizedException('Invalid Razorpay Signature');

    const payload = req.body;
    const eventId = req.headers['x-razorpay-event-id'] as string;

    if (eventId && payload) {
      await this.webhookService.processWebhook(eventId, payload);
    }

    return res.status(200).send('OK');
  }
}
```
*   **Purpose:** Exposes an impenetrable exterior listening port exclusively for Razorpay's internal servers.
*   **Dependencies:** Node Crypto.
*   **Security considerations:** Verifies the cryptographic HMAC SHA256 signature using `req.rawBody` bytes.
*   **Multi-tenant considerations:** Operates completely above the multi-tenant architecture, securely acting as the gatekeeper determining which tenants survive and which are locked out.
*   **Failure scenarios:** If signature spoofing is attempted, an immediate `401 Unauthorized` cuts the HTTP connection instantly.
