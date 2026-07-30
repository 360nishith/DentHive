import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private tenantCacheService: TenantCacheService
  ) {}

  async overrideBilling(tenantId: string, status: string, daysToAdd: number) {
    return require('../../common/context/als').als.run({ tenantId: undefined }, async () => {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status }
      });

      if (daysToAdd > 0) {
        const currentSub = await this.prisma.subscription.findFirst({
          where: { tenantId }
        });

        let currentEnd = currentSub && currentSub.currentPeriodEnd > new Date() ? currentSub.currentPeriodEnd : new Date();
        currentEnd.setDate(currentEnd.getDate() + daysToAdd);

        if (currentSub) {
          await this.prisma.subscription.update({
            where: { id: currentSub.id },
            data: {
              status: 'ACTIVE',
              currentPeriodEnd: currentEnd,
              cancelAtPeriodEnd: false
            }
          });
        } else {
          await this.prisma.subscription.create({
            data: {
              tenantId,
              planTier: 'STANDARD',
              status: 'ACTIVE',
              currentPeriodEnd: currentEnd
            }
          });
        }
      }

      // Force flush the cache so the iron gate picks up the new status instantly
      await this.tenantCacheService.setStatus(tenantId, status);
      return { success: true };
    });
  }

  async getDashboardStats() {
    const tenants: any = await this.prisma.tenant.findMany({
      include: { subscriptions: true }
    });

    let totalMRR = 0;
    let activeSubscriptions = 0;
    let activeTrials = 0;
    let expiredTrials = 0;

    for (const t of tenants) {
      const activeSub = t.subscriptions?.find((s: any) => s.status === 'ACTIVE' && new Date(s.currentPeriodEnd).getTime() > Date.now());
      const hasOldSub = t.subscriptions?.some((s: any) => s.status === 'ACTIVE');
      const daysUsed = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      if (activeSub) {
        activeSubscriptions++;
        // Calculate MRR based on BYOS or standard
        const isByos = !!t.waAccessToken;
        totalMRR += isByos ? parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999') : parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499');
      } else {
        if (daysUsed <= 14 && !hasOldSub) {
          activeTrials++;
        } else {
          expiredTrials++;
        }
      }
    }

    return {
      totalMRR,
      activeSubscriptions,
      activeTrials,
      expiredTrials,
      totalTenants: tenants.length
    };
  }

  async getTenants() {
    const tenants: any = await this.prisma.tenant.findMany({
      include: {
        subscriptions: true,
        _count: {
          select: { patients: true, users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tenants.map((t: any) => {
      const activeSub = t.subscriptions?.find((s: any) => s.status === 'ACTIVE' && new Date(s.currentPeriodEnd).getTime() > Date.now());
      const hasOldSub = t.subscriptions?.some((s: any) => s.status === 'ACTIVE');
      const daysUsed = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      let derivedStatus = 'TRIAL';
      if (activeSub) {
        derivedStatus = 'SUBSCRIBED';
      } else if (hasOldSub || daysUsed > 14) {
        derivedStatus = 'EXPIRED';
      }

      return {
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        createdAt: t.createdAt,
        patientCount: t._count?.patients || 0,
        staffCount: t._count?.users || 0,
        isBYOS: !!t.waAccessToken,
        status: derivedStatus,
        mrr: activeSub ? (t.waAccessToken ? parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || '1999') : parseInt(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || '2499')) : 0
      };
    });
  }

  async deleteTenant(id: string) {
    // We MUST run this with tenantId = null so the global Prisma Middleware doesn't intercept
    // the deleteMany queries and silently overwrite where.tenantId with the Super Admin's own tenantId.
    return require('../../common/context/als').als.run({ tenantId: undefined }, async () => {
      // Find all users before deleting anything
      const users = await this.prisma.user.findMany({ where: { tenantId: id }, select: { authId: true } });
      
      return this.prisma.$transaction(async (tx) => {
        // 1. Logs and standalone records
        await tx.auditLog.deleteMany({ where: { tenantId: id } });
        await tx.notification.deleteMany({ where: { tenantId: id } });
        
        // 2. Billing & Subscriptions
        await tx.payment.deleteMany({ where: { tenantId: id } });
        await tx.subscription.deleteMany({ where: { tenantId: id } });
        
        // 3. Communications and Reminders
        await tx.whatsAppMessage.deleteMany({ where: { tenantId: id } });
        await tx.appointmentReminder.deleteMany({ where: { tenantId: id } });
        await tx.followUp.deleteMany({ where: { tenantId: id } });
        await tx.recallList.deleteMany({ where: { tenantId: id } });
        
        // 4. Core Workflow (Appointments before stages)
        await tx.appointment.deleteMany({ where: { tenantId: id } });
        
        // 5. Journeys and Stages
        await tx.treatmentStage.deleteMany({ where: { tenantId: id } });
        await tx.treatmentJourney.deleteMany({ where: { tenantId: id } });
        
        // 6. Templates
        const templates = await tx.treatmentTemplate.findMany({ where: { tenantId: id }, select: { id: true } });
        const templateIds = templates.map((t: any) => t.id);
        if (templateIds.length > 0) {
          await tx.templateStage.deleteMany({ where: { templateId: { in: templateIds } } });
        }
        await tx.treatmentTemplate.deleteMany({ where: { tenantId: id } });
        
        // 6.5 Clinical Records & Images
        await tx.prescription.deleteMany({ where: { tenantId: id } });
        await tx.doctorMedicine.deleteMany({ where: { tenantId: id } });
        await tx.treatmentStageImage.deleteMany({ where: { tenantId: id } });

        // 7. Entities (Users and Patients)
        await tx.file.deleteMany({ where: { tenantId: id } });
        await tx.patient.deleteMany({ where: { tenantId: id } });
        
        // 8. Delete all users from the database
        await tx.user.deleteMany({ where: { tenantId: id } });
        
        // 9. Actually delete the Tenant
        const deletedTenant = await tx.tenant.delete({ where: { id } });

        // 10. Clean up Supabase Auth Accounts
        // We do this outside the transaction so if it fails, the DB still rolls back,
        // but if it succeeds, the users are gone forever.
        for (const user of users) {
          if (user.authId) {
            try {
              await this.supabaseService.deleteUser(user.authId);
            } catch (e) {
              console.error(`Failed to delete user ${user.authId} from Supabase:`, e);
            }
          }
        }

        return deletedTenant;
      }, { timeout: 30000 });
    });
  }

  async importCsv(tenantId: string, fileBuffer: Buffer) {
    try {
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });

      let successCount = 0;
      let failCount = 0;

      for (const row of records as any[]) {
        // Try to find Name, FirstName, LastName
        const firstName = row['FirstName'] || row['First Name'] || row['First_Name'] || '';
        const lastName = row['LastName'] || row['Last Name'] || row['Last_Name'] || '';
        let fullName = row['Name'] || row['FullName'] || row['Full Name'] || '';
        
        if (!fullName && (firstName || lastName)) {
          fullName = `${firstName} ${lastName}`.trim();
        }

        // Phone
        const rawPhone = row['Phone'] || row['PhoneNumber'] || row['Phone Number'] || row['Mobile'] || '';
        const phone = rawPhone.replace(/\D/g, '');

        if (!fullName || !phone) {
          failCount++;
          continue;
        }

        // Gender
        let gender = null;
        const rawGender = (row['Gender'] || row['Sex'] || '').toLowerCase();
        if (rawGender.startsWith('m')) gender = 'Male';
        if (rawGender.startsWith('f')) gender = 'Female';
        if (rawGender.startsWith('o')) gender = 'Other';

        // Age / DOB
        let dob = null;
        const rawAge = parseInt(row['Age']);
        if (!isNaN(rawAge) && rawAge > 0) {
          const currentYear = new Date().getFullYear();
          const birthYear = currentYear - rawAge;
          dob = new Date(`${birthYear}-01-01`);
        } else if (row['DOB'] || row['DateOfBirth']) {
          const parsedDate = new Date(row['DOB'] || row['DateOfBirth']);
          if (!isNaN(parsedDate.getTime())) {
            dob = parsedDate;
          }
        }

        try {
          const existingPatient = await this.prisma.patient.findFirst({
            where: { tenantId, phoneNumber: phone }
          });

          if (existingPatient) {
            await this.prisma.patient.update({
              where: { id: existingPatient.id },
              data: {
                name: fullName,
                gender: gender || undefined,
                dateOfBirth: dob || undefined
              }
            });
          } else {
            await this.prisma.patient.create({
              data: {
                tenantId,
                name: fullName,
                phoneNumber: phone,
                gender,
                dateOfBirth: dob,
                whatsappOptIn: true
              }
            });
          }
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      return { success: true, successCount, failCount };
    } catch (error) {
      throw new BadRequestException('Failed to parse CSV file. Ensure it has headers.');
    }
  }

  async inviteClient(dto: any) {
    const { clinicName, subdomain, firstName, lastName, phone, email, password } = dto;

    if (!clinicName || !subdomain || !email || !password) {
      throw new BadRequestException('Missing required fields');
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
      // 1. Check if subdomain exists
      const existingTenant = await this.prisma.tenant.findUnique({ where: { subdomain } });
      if (existingTenant) {
        throw new BadRequestException('Subdomain already exists');
      }

      // 2. Create user in Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'ADMIN'
        }
      });

      if (authError || !authData.user) {
        throw new BadRequestException(`Failed to create user in auth: ${authError?.message}`);
      }

      const userId = authData.user.id;

      let adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
      if (!adminRole) {
        adminRole = await this.prisma.role.create({ data: { name: 'ADMIN' } });
      }

      // 3. Create Tenant and User in Prisma
      const tenant = await this.prisma.tenant.create({
        data: {
          name: clinicName,
          subdomain,
          users: {
            create: {
              authId: userId,
              email,
              firstName: firstName || '',
              lastName: lastName || '',
              phoneNumber: phone || '',
              roleId: adminRole.id,
              passwordHash: 'supabase_managed'
            }
          }
        }
      });

      // 4. Update user metadata in Supabase to link tenantId
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { tenantId: tenant.id, role: 'ADMIN' }
      });

      return { success: true, tenantId: tenant.id };
    } catch (err: any) {
      console.error('Invite Client Error:', err);
      throw new InternalServerErrorException(err.message || 'Failed to create client');
    }
  }
}
