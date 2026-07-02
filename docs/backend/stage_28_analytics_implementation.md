# STAGE 28 — Analytics Module Implementation

**Subject:** Read-Only Intelligence & Dashboards
**Stack:** NestJS, Prisma, PostgreSQL
**Core Features:** Real-Time Aggregation, Multi-Tenant Safe, Dashboard-Ready Payloads.

---

## Folder Structure
```text
src/modules/analytics/
├── controllers/
│   └── analytics.controller.ts
├── services/
│   └── analytics.service.ts
├── dto/
│   └── analytics.dto.ts
└── analytics.module.ts
```

---

## 1. DTOs

### `src/modules/analytics/dto/analytics.dto.ts`
```typescript
import { IsDateString, IsNotEmpty } from 'class-validator';

export class AnalyticsDateRangeDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
```
*   **Purpose:** Ensures the frontend dashboard strictly provides valid ISO8601 boundary dates for aggregation queries.
*   **Dependencies:** `class-validator`.
*   **Security considerations:** Prevents SQL injection or unbounded queries that could crash the database through excessive memory allocation.
*   **Multi-tenant considerations:** Date boundaries apply within the isolated tenant context.
*   **Failure scenarios:** Missing dates result in an immediate `400 Bad Request`.

---

## 2. Services

### `src/modules/analytics/services/analytics.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsDateRangeDto } from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // 1. Core Clinic Dashboard Metrics
  async getDashboardMetrics(tenantId: string, query: AnalyticsDateRangeDto) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    // Run parallel, independent aggregation queries
    const [appointments, journeys, revenuePipeline] = await Promise.all([
      // A. Appointment Attendance & No-Show
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          startTime: { gte: start, lte: end },
          status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] }
        },
        _count: { id: true }
      }),
      
      // B. Treatment Completion Rate
      this.prisma.treatmentJourney.groupBy({
        by: ['status'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { id: true }
      }),

      // C. Revenue Pipeline (In Progress Journeys)
      this.prisma.journeyRevenue.aggregate({
        where: {
          journey: { status: 'IN_PROGRESS' },
          createdAt: { gte: start, lte: end }
        },
        _sum: { plannedAmount: true, collectedAmount: true }
      })
    ]);

    // Parse Data into Frontend-Ready Dashboard Cards
    const completedApt = appointments.find(a => a.status === 'COMPLETED')?._count.id || 0;
    const noShowApt = appointments.find(a => a.status === 'NO_SHOW')?._count.id || 0;
    const totalActionableApt = completedApt + noShowApt;

    const completedJourneys = journeys.find(j => j.status === 'COMPLETED')?._count.id || 0;
    const totalJourneys = journeys.reduce((sum, j) => sum + j._count.id, 0);

    return {
      attendanceRate: totalActionableApt ? (completedApt / totalActionableApt) * 100 : 0,
      noShowRate: totalActionableApt ? (noShowApt / totalActionableApt) * 100 : 0,
      treatmentCompletionRate: totalJourneys ? (completedJourneys / totalJourneys) * 100 : 0,
      revenuePipeline: revenuePipeline._sum.plannedAmount || 0,
      revenueCollected: revenuePipeline._sum.collectedAmount || 0,
    };
  }

  // 2. Dentist Performance Table
  async getDentistPerformance(tenantId: string, query: AnalyticsDateRangeDto) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const performance = await this.prisma.appointment.groupBy({
      by: ['dentistId'],
      where: {
        startTime: { gte: start, lte: end },
        status: 'COMPLETED'
      },
      _count: { id: true }
    });

    // Note: In a true reporting system, we would map the dentistId to their User.name,
    // requiring a manual array map or a View.
    return performance.map(p => ({
      dentistId: p.dentistId,
      completedAppointments: p._count.id
    }));
  }

  // 3. Operational Follow-Up Success
  async getFollowUpMetrics(tenantId: string, query: AnalyticsDateRangeDto) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const followUps = await this.prisma.followUp.groupBy({
      by: ['status'],
      where: { scheduledDate: { gte: start, lte: end } },
      _count: { id: true }
    });

    const completed = followUps.find(f => f.status === 'COMPLETED')?._count.id || 0;
    const pending = followUps.find(f => f.status === 'PENDING')?._count.id || 0;
    const total = followUps.reduce((sum, f) => sum + f._count.id, 0);

    return {
      totalAssigned: total,
      pendingAction: pending,
      successRate: total ? (completed / total) * 100 : 0
    };
  }
}
```
*   **Purpose:** The read-only intelligence layer that computes core KPIs directly at the database level.
*   **Dependencies:** `PrismaService`.
*   **Security considerations:** Data access is strictly limited to computed aggregates (Counts and Sums). PII (Patient Names, Phone Numbers) is intentionally inaccessible via this service.
*   **Multi-tenant considerations:** Every `groupBy` and `aggregate` query inherently inherits the `tenantId` injection via the Prisma `$allOperations` extension safely.
*   **Performance Optimization:** Aggregations utilize `Promise.all` to execute simultaneously against the PostgreSQL engine. Instead of fetching raw row data into Node.js memory, it forces PostgreSQL to compute the sums (`_sum`) and counts (`_count`) via native SQL operators, ensuring O(1) memory usage in the API regardless of clinic size.

---

## 3. Controllers

### `src/modules/analytics/controllers/analytics.controller.ts`
```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsDateRangeDto } from '../dto/analytics.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions({ action: 'READ', subject: 'ANALYTICS' })
  async getDashboardMetrics(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getDashboardMetrics(user.tenantId, query);
  }

  @Get('dentists')
  @RequirePermissions({ action: 'READ', subject: 'ANALYTICS' })
  async getDentistPerformance(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getDentistPerformance(user.tenantId, query);
  }

  @Get('follow-ups')
  @RequirePermissions({ action: 'READ', subject: 'ANALYTICS' })
  async getFollowUpMetrics(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getFollowUpMetrics(user.tenantId, query);
  }
}
```
*   **Purpose:** Exposes dashboard-ready payloads for the frontend UI.
*   **Dependencies:** Global NestJS Guards.
*   **Security considerations:** `TenantStatusGuard` is NOT applied to `GET` endpoints, allowing clinics (even suspended ones) to view their historical metrics. 
*   **Multi-tenant considerations:** Safely maps `user.tenantId` from the JWT into the service.
*   **Failure scenarios:** Requires the specific `READ:ANALYTICS` permission, strictly preventing standard receptionists from viewing the clinic's total revenue pipeline.
