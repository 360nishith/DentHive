import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppointmentsService } from './services/appointments.service';
import { ReminderService } from './services/reminder.service';
import { NoShowCronService } from './services/no-show.cron';
import { WhatsappRemindersProcessor } from './workers/whatsapp-reminders.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({
      name: 'whatsapp-reminders',
    }),
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, ReminderService, NoShowCronService, WhatsappRemindersProcessor, PrismaService],
})
export class AppointmentsModule {}
