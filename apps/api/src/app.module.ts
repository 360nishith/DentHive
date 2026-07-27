import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from './common/redis/redis.module';

import { EventEmitterModule } from '@nestjs/event-emitter';

import { ScheduleModule } from '@nestjs/schedule';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { JourneysModule } from './modules/journeys/journeys.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { FollowUpsModule } from './modules/followups/followups.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';
import { MedicinesModule } from './modules/medicines/medicines.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 50,
    }]),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: () => {
        let connection: any = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        };
        
        if (process.env.REDIS_URL) {
          const url = new URL(process.env.REDIS_URL);
          connection = {
            host: url.hostname,
            port: parseInt(url.port || '6379'),
            password: url.password || undefined,
            username: url.username || undefined,
            tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
            maxRetriesPerRequest: null
          };
        }
        
        return { connection };
      }
    }),
    RedisModule,
    AuthModule,
    TenantModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    JourneysModule,
    BillingModule,
    AnalyticsModule,
    WebhooksModule,
    FollowUpsModule,
    WhatsAppModule,
    StorageModule,
    AdminModule,
    MedicinesModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('webhooks/(.*)', 'health')
      .forRoutes('*');

    consumer
      .apply(RawBodyMiddleware)
      .forRoutes(
        { path: 'webhooks/razorpay', method: RequestMethod.POST },
        { path: 'webhooks/whatsapp', method: RequestMethod.POST }
      );
  }
}
