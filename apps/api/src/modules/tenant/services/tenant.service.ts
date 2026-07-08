import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService
  ) {}

  async createClinic(userId: string, data: { name: string; subdomain: string; userFirstName: string; userLastName: string; userPhone: string }) {
    // Determine if user already has a clinic by checking if they exist in our users table
    const existing = await this.prisma.user.findFirst({
      where: { authId: userId },
      select: { tenantId: true }
    });

    if (existing?.tenantId) {
      throw new ConflictException('User is already associated with a clinic.');
    }

    // Wrap in a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create the new Tenant (Clinic)
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: data.subdomain,
          status: 'TRIAL', // Give them a 14-day free trial initially
        }
      });

      // 2. We need the 'ADMIN' role ID from the database
      let adminRole = await tx.role.findUnique({ where: { name: 'ADMIN' } });
      if (!adminRole) {
        // Fallback: create it if it doesn't exist yet (useful during early dev)
        adminRole = await tx.role.create({ data: { name: 'ADMIN' } });
      }

      // 3. Physically CREATE the User record inside the local database
      await tx.user.create({
        data: {
          authId: userId,
          tenantId: tenant.id,
          roleId: adminRole.id,
          firstName: data.userFirstName,
          lastName: data.userLastName,
          phoneNumber: data.userPhone,
          isActive: true,
          status: 'ACTIVE',
          passwordHash: 'supabase_managed', // We don't store passwords, Supabase does
        }
      });

      // 4. Update the user's `app_metadata` in Supabase so future JWTs contain the correct claims
      await this.supabaseService.updateUserMetadata(userId, {
        tenantId: tenant.id,
        role: 'ADMIN'
      });

      return tenant;
    });
  }

  async getMyClinic(tenantId: string, email?: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      include: { subscriptions: true }
    });

    if (!tenant) return null;

    // Super Admin Bypass for Frontend
    if (email === 'nishithdharmaraj@gmail.com') {
      return {
        ...tenant,
        status: 'ACTIVE',
        subscriptions: [
          {
            id: 'super-admin-lifetime-sub',
            tenantId,
            planTier: 'LIFETIME',
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date('2099-12-31T23:59:59.000Z'),
            razorpaySubId: null,
            razorpayPlanId: null,
            razorpayCustomerId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };
    }

    // Dynamically compute status so it applies globally to all Admin and Staff users on the frontend
    const activeSub = tenant.subscriptions.find(s => ['ACTIVE', 'PENDING'].includes(s.status) && new Date(s.currentPeriodEnd).getTime() > Date.now());
    const hasOldSub = tenant.subscriptions.some(s => ['ACTIVE', 'PENDING'].includes(s.status));
    const daysUsed = Math.floor((Date.now() - new Date(tenant.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    let computedStatus = tenant.status;
    if (!activeSub) {
      if (hasOldSub || daysUsed > 14) {
        computedStatus = 'READ_ONLY';
      } else {
        computedStatus = 'TRIAL';
      }
    } else {
      computedStatus = 'ACTIVE';
    }

    return {
      ...tenant,
      status: computedStatus
    };
  }

  async updateClinic(tenantId: string, data: { name?: string; upiVpa?: string; waPhoneNumberId?: string; waAccessToken?: string; waAppSecret?: string }) {
    let razorpayPlanChanged = false;
    let oldPlan = 'STANDARD';
    let newPlan = 'STANDARD';

    // Actively validate Meta keys if they are being updated
    if (data.waPhoneNumberId && data.waAccessToken) {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${data.waPhoneNumberId}?access_token=${data.waAccessToken}`);
        if (!response.ok) {
          throw new BadRequestException('Invalid WhatsApp Keys provided. Meta rejected the connection.');
        }
        const result = await response.json();
        if (result.error) {
          throw new BadRequestException('Invalid WhatsApp Keys provided. Meta rejected the connection.');
        }
        
        // If keys are valid, they are now on BYOS!
        newPlan = 'BYOS';
        razorpayPlanChanged = true;
      } catch (e: any) {
        throw new BadRequestException(e.message || 'Invalid WhatsApp Keys provided. Meta rejected the connection.');
      }
    } else if (data.waPhoneNumberId === null || data.waAccessToken === null) {
      // If they deleted their keys, they are back to standard
      newPlan = 'STANDARD';
      razorpayPlanChanged = true;
    }

    if (razorpayPlanChanged) {
      // Find if they have an active subscription mandate
      const activeSub = await this.prisma.subscription.findFirst({
        where: { tenantId, status: 'ACTIVE', razorpaySubId: { not: null } }
      });
      
      if (activeSub && activeSub.planTier !== newPlan) {
        const RazorpayService = require('../../billing/services/razorpay.service').RazorpayService;
        const razorpay = new RazorpayService(this.prisma);
        
        const price = newPlan === 'BYOS' 
          ? parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999')
          : parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499');

        // Swap the plan seamlessly in Razorpay for their next billing cycle
        try {
          await razorpay.updateSubscriptionPlan(activeSub.razorpaySubId, newPlan, price);
          // Also update the database planTier
          await this.prisma.subscription.update({
            where: { id: activeSub.id },
            data: { planTier: newPlan }
          });
        } catch (e) {
          console.error("Failed to automatically swap Razorpay Plan:", e);
        }
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        upiVpa: data.upiVpa,
        waPhoneNumberId: data.waPhoneNumberId,
        waAccessToken: data.waAccessToken,
        waAppSecret: data.waAppSecret
      }
    });
  }

  async getNotifications(tenantId: string, userId: string) {
    const dbNotifs = await this.prisma.notification.findMany({
      where: { 
        tenantId, 
        OR: [{ userId }, { userId: null }],
        read: false
      },
      orderBy: { createdAt: 'desc' }
    });

    const tenant = await this.prisma.tenant.findUnique({ 
      where: { id: tenantId },
      include: { subscriptions: true }
    });
    const dynamicNotifs = [];

    const isSubscribed = tenant?.subscriptions?.some(s => s.status === 'ACTIVE');

    // Dynamically inject Trial Warning if applicable and NOT subscribed
    if (tenant?.createdAt && !isSubscribed) {
      const daysUsed = Math.floor((Date.now() - new Date(tenant.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, 14 - daysUsed);
      
      if (daysLeft <= 3 && tenant.status !== 'SUSPENDED') {
        dynamicNotifs.push({
          id: 'trial-warning',
          title: 'Trial Expiring Soon',
          message: `Your 14-day free trial expires in ${daysLeft} days. Subscribe now to prevent service interruption across your clinic.`,
          type: 'WARNING',
          read: false,
          createdAt: new Date().toISOString()
        });
      } else if (tenant.status === 'SUSPENDED') {
        dynamicNotifs.push({
          id: 'account-suspended',
          title: 'Account Suspended',
          message: 'Your clinic subscription has expired. Please update your billing details immediately to restore access for you and your staff.',
          type: 'ERROR',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    return [...dynamicNotifs, ...dbNotifs];
  }

  async markNotificationsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, OR: [{ userId }, { userId: null }] },
      data: { read: true }
    });
    return { success: true };
  }

  async exportData(tenantId: string) {
    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      include: {
        treatmentJourneys: {
          include: {
            template: true,
            stages: true
          }
        },
        appointments: true
      }
    });

    const headers = ['Patient ID', 'Name', 'Phone', 'Created At', 'Journeys Count', 'Appointments Count'];
    const rows = patients.map(p => [
      p.id,
      p.name,
      `="${p.phoneNumber}"`, // Forces Excel to treat it as a raw string
      new Date(p.createdAt).toISOString(),
      p.treatmentJourneys.length.toString(),
      p.appointments.length.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { csv: csvContent };
  }

  async resetDemoData(tenantId: string) {
    // SECURITY: This forcefully wipes all operational data but retains clinic settings, templates, and staff.
    // Order of deletion is critical due to foreign key constraints.
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete deep dependencies
      await tx.payment.deleteMany({ where: { tenantId } });
      await tx.appointmentReminder.deleteMany({ where: { tenantId } });
      await tx.appointment.deleteMany({ where: { tenantId } });
      await tx.followUp.deleteMany({ where: { tenantId } });
      await tx.whatsappMessage.deleteMany({ where: { tenantId } });

      // 2. Delete middle dependencies
      await tx.treatmentStage.deleteMany({ where: { tenantId } });
      await tx.treatmentJourney.deleteMany({ where: { tenantId } });
      await tx.recallList.deleteMany({ where: { tenantId } });
      await tx.file.deleteMany({ where: { tenantId } });

      // 3. Delete root operational records
      await tx.patient.deleteMany({ where: { tenantId } });
      await tx.notification.deleteMany({ where: { tenantId } });
      await tx.auditLog.deleteMany({ where: { tenantId } });

      return { success: true, message: 'Demo data completely wiped.' };
    });
  }
}
