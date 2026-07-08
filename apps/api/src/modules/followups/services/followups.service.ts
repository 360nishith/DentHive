import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FollowUpsService {
  constructor(private prisma: PrismaService) {}

  async getPendingFollowUps(tenantId: string) {
    // Fetch pending FollowUps (Missed Appt, Post-Op)
    const followUps = await this.prisma.followUp.findMany({
      where: { 
        tenantId,
        stage: {
          journey: {
            patient: { status: 'ACTIVE' }
          }
        }
      },
      include: {
        stage: { include: { journey: { include: { patient: true } } } }
      },
      orderBy: { triggerAt: 'desc' },
      take: 20
    });

    // Fetch pending Recalls
    const recalls = await this.prisma.recallList.findMany({
      where: { 
        tenantId,
        patient: { status: 'ACTIVE' }
      },
      include: { patient: true },
      orderBy: { recallDate: 'desc' },
      take: 20
    });

    const combinedList = [];

    // Map FollowUps
    for (const f of followUps) {
      const patient = f.stage?.journey?.patient;
      if (!patient) continue;
        let label = 'Missed Appt';
        if (f.nudgeType === 'POST_OP') label = 'Post-Op Nudge';
        else if (f.nudgeType === 'RESCHEDULE_REQ') label = 'Reschedule Request';
        
        combinedList.push({
          id: f.id,
          patientName: patient.name,
          triggerType: label,
          status: f.status, // PENDING, PROCESSED
        date: f.triggerAt
      });
    }

    // Map Recalls
    for (const r of recalls) {
      combinedList.push({
        id: r.id,
        patientName: r.patient.name,
        triggerType: 'Recall (6 Mo)',
        status: r.status,
        date: r.recallDate
      });
    }

    // Fetch and Map raw WhatsApp Messages (Payment links, Reminders, Manual)
    const waMessages = await this.prisma.whatsAppMessage.findMany({
      where: { tenantId },
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    for (const msg of waMessages) {
      if (!msg.patient) continue;
      
      let label = 'WhatsApp Message';
      const payload: any = msg.payload || {};
      
      if (payload.type === 'appointment_reminder' || payload.template === 'appointment_reminder') {
        label = 'Appointment Reminder';
      } else if (payload.type === 'text' && payload.text?.includes('upi://pay')) {
        label = 'Payment Link';
      } else if (payload.template) {
        label = `Template: ${payload.template}`;
      }

      combinedList.push({
        id: msg.id,
        patientName: msg.patient.name,
        triggerType: label,
        status: msg.status,
        date: msg.createdAt
      });
    }

    // Sort combined list by date descending
    combinedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return combinedList;
  }

  async getStalledJourneys(tenantId: string) {
    // A journey is stalled if it is ACTIVE and has no SCHEDULED appointments
    const activeJourneys = await this.prisma.treatmentJourney.findMany({
      where: { 
        tenantId, 
        status: 'ACTIVE',
        patient: { status: 'ACTIVE' }
      },
      include: {
        patient: true,
        template: true,
        tenant: true,
        stages: {
          include: {
            templateStage: true,
            appointments: true
          },
          orderBy: { sequenceOrder: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const stalled = activeJourneys.filter(j => {
      // If any stage has an active appointment in the future, it's not stalled
      const hasScheduledAppt = j.stages.some(s => 
        s.appointments.some(a => 
          (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && 
          new Date(a.scheduledStart).getTime() >= new Date().setHours(0,0,0,0)
        )
      );
      return !hasScheduledAppt;
    });

    return stalled.map(j => {
      const completedStages = j.stages.filter(s => s.status === 'COMPLETED');
      const lastCompleted = completedStages.length > 0 ? completedStages[0].name : null;
      
      // Calculate days stalled based on the last completed stage or journey creation
      let daysStalled = 0;
      const refDate = completedStages.length > 0 && completedStages[0].completedAt 
        ? completedStages[0].completedAt 
        : j.createdAt;
      
      daysStalled = Math.floor((new Date().getTime() - new Date(refDate).getTime()) / (1000 * 3600 * 24));

      // Calculate Stall Reason
      let stallReason = 'Not Started';
      const allAppts = j.stages.flatMap(s => s.appointments).sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
      if (allAppts.length > 0) {
        const latestAppt = allAppts[0];
        if (latestAppt.status === 'CANCELLED') stallReason = 'Patient Cancelled';
        else if (latestAppt.status === 'RESCHEDULE_REQUESTED') stallReason = 'Requested Reschedule';
        else if (latestAppt.status === 'NO_SHOW') stallReason = 'No Show';
        else if (latestAppt.status === 'COMPLETED') stallReason = 'Needs Next Appt';
        else stallReason = 'No Future Appts';
      }

      return {
        patientId: j.patient.id,
        patientName: j.patient.name,
        patientPhone: j.patient.phoneNumber,
        clinicName: j.tenant.name,
        treatmentName: j.template?.name || 'Custom Journey',
        lastCompletedStage: lastCompleted,
        daysStalled,
        currentStageId: j.currentStageId,
        stallReason
      };
    });
  }
}
