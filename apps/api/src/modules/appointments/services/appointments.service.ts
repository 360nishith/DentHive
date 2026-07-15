import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @InjectQueue('whatsapp-reminders') private reminderQueue: Queue
  ) {}

  async createAppointment(tenantId: string, data: { patientId: string; doctorId?: string; treatmentStageId: string; scheduledStart: string; scheduledEnd: string }) {
    try {
      // Auto-resolve any stalled or requested-reschedule appointments for this stage
      // so we don't end up with ghost cards on the calendar
      await this.prisma.appointment.updateMany({
        where: {
          tenantId,
          treatmentStageId: data.treatmentStageId,
          status: { in: ['RESCHEDULE_REQUESTED', 'NO_SHOW'] }
        },
        data: { status: 'CANCELLED' }
      });

      let assignedDoctorId = data.doctorId;
      if (!assignedDoctorId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: data.patientId }, select: { doctorId: true } });
        if (patient?.doctorId) {
          assignedDoctorId = patient.doctorId;
        }
      }

      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId,
          patientId: data.patientId,
          doctorId: assignedDoctorId || undefined,
          treatmentStageId: data.treatmentStageId,
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd: new Date(data.scheduledEnd),
          status: 'SCHEDULED'
        },
        include: {
          patient: true
        }
      });

      this.eventEmitter.emit('appointment.created', appointment);

      return appointment;
    } catch (error: any) {
      if (error.code === 'P2002' || error.message.includes('overlapping_appointments')) {
        throw new ConflictException('This timeslot is already booked.');
      }
      throw error;
    }
  }

  async getCalendar(tenantId: string, startDate: string, endDate: string, doctorId?: string) {
    const where: any = {
      tenantId,
      patient: { status: 'ACTIVE' },
      scheduledStart: { 
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    if (doctorId) {
      where.doctorId = doctorId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phoneNumber: true, whatsappOptIn: true } },
        treatmentStage: { include: { templateStage: true } },
        doctor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { scheduledStart: 'asc' }
    });
  }

  async getPatientAppointments(tenantId: string, patientId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId, patientId },
      include: {
        treatmentStage: { include: { templateStage: true } },
        doctor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { scheduledStart: 'asc' }
    });
  }
  async updateAppointment(tenantId: string, appointmentId: string, data: { status?: string; scheduledStart?: string; scheduledEnd?: string }) {
    const original = await this.prisma.appointment.findFirst({ where: { id: appointmentId } });
    if (!original) throw new ConflictException('Appointment not found');

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.scheduledStart) updateData.scheduledStart = new Date(data.scheduledStart);
    if (data.scheduledEnd) updateData.scheduledEnd = new Date(data.scheduledEnd);
    
    await this.prisma.appointment.updateMany({
      where: { id: appointmentId, tenantId },
      data: updateData
    });
    
    const updated = await this.prisma.appointment.findFirst({ where: { id: appointmentId } });
    
    this.eventEmitter.emit('appointment.updated', {
      original,
      updated
    });

    return updated;
  }

  async testFireReminder(tenantId: string, appointmentId: string) {
    let reminder = await this.prisma.appointmentReminder.findFirst({
      where: { appointmentId, tenantId, status: 'PENDING' }
    });
    
    if (!reminder) {
      // For demo purposes, if no pending reminder exists, create one on the fly!
      reminder = await this.prisma.appointmentReminder.create({
        data: {
          tenantId,
          appointmentId,
          type: 'SAME_DAY_MORNING',
          status: 'PENDING',
          scheduledFor: new Date(),
          whatsappMessageId: 'TEST_' + require('crypto').randomUUID()
        }
      });
    }
    
    // Fire it to the queue instantly with 0 delay
    await this.reminderQueue.add('send-reminder', { reminderId: reminder.id, tenantId }, { delay: 0 });
    return { success: true, message: 'Fired reminder to queue instantly' };
  }
}
