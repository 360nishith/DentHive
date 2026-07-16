import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { als } from '../common/context/als';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  public extended: any;

  constructor() {
    super();

    // The Ultimate Multi-Tenant Isolation Hook (Prisma Middleware)
    this.$use(async (params, next) => {
      const store = als.getStore();
      const tenantId = store?.tenantId;
      const userId = store?.userId;
      const role = store?.role;

      // Skip isolation for internal/webhook operations where tenantId is explicitly null or injected manually
      if (!tenantId) {
        return next(params);
      }

      if (!params.args) params.args = {};

      // Inject tenantId globally for isolated queries, EXCEPT for models that don't have it
      const globalModelsWithoutTenantId = ['Tenant', 'Role'];
      if (params.model && !globalModelsWithoutTenantId.includes(params.model)) {
        if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'updateMany', 'deleteMany', 'update', 'delete'].includes(params.action)) {
           if (!params.args.where) params.args.where = {};
           params.args.where.tenantId = tenantId;
        }
        if (['create', 'update', 'upsert'].includes(params.action)) {
           if (!params.args.data) params.args.data = {};
           params.args.data.tenantId = tenantId;
        }
      }

      // Enforce Doctor Isolation for clinical tables
      if ((role === 'DENTIST' || role === 'ADMIN') && userId) {
        const isolatedModels = ['Patient', 'Appointment', 'TreatmentJourney', 'Payment'];
        if (params.model && isolatedModels.includes(params.model)) {
          if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'updateMany', 'deleteMany', 'update', 'delete'].includes(params.action)) {
            if (!params.args.where) params.args.where = {};
            // Allow explicit queries for unassigned patients (doctorId = null).
            // If they are not querying for unassigned, force isolation to their own ID.
            if (params.args.where.doctorId !== null) {
              params.args.where.doctorId = userId;
            }
          }
          if (['create', 'update', 'upsert'].includes(params.action)) {
            if (!params.args.data) params.args.data = {};
            // Allow creating/updating unassigned patients
            if (params.args.data.doctorId !== null) {
              params.args.data.doctorId = userId;
            }
          }
          if (params.action === 'createMany' && Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((d: any) => ({ ...d, doctorId: d.doctorId === null ? null : userId }));
          }
        }
      }
      
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma Engine Connected with RLS Hooks active.');
  }
}
