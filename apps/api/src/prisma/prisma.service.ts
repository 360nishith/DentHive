import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { als } from '../common/context/als';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  public extended: any;

  constructor() {
    super();

    // The Ultimate Multi-Tenant Isolation Hook ($allOperations)
    this.extended = this.$extends({
      query: {
        $allOperations({ model, operation, args, query }: any) {
          const store = als.getStore();
          const tenantId = store?.tenantId;
          const userId = store?.userId;
          const role = store?.role;

          // Skip isolation for internal/webhook operations where tenantId is explicitly null or injected manually
          if (!tenantId) {
            return query(args);
          }

          // If the model doesn't have a tenantId field (e.g. system tables), skip
          // For simplicity, we assume models that should be isolated have tenantId in their Prisma schema.
          // Forcefully inject where: { tenantId }
          args.where = { ...args.where, tenantId };

          // Enforce Doctor Isolation for clinical tables
          if ((role === 'DENTIST' || role === 'ADMIN') && userId) {
            const isolatedModels = ['Patient', 'Appointment', 'TreatmentJourney', 'Payment'];
            if (isolatedModels.includes(model)) {
              if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'updateMany', 'deleteMany'].includes(operation)) {
                args.where = { ...args.where, doctorId: userId };
              }
              if (['create', 'update', 'upsert'].includes(operation)) {
                if (args.data) args.data.doctorId = userId;
              }
              if (operation === 'createMany' && Array.isArray(args.data)) {
                args.data = args.data.map((d: any) => ({ ...d, doctorId: userId }));
              }
            }
          }
          
          return query(args);
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma Engine Connected with RLS Hooks active.');
  }
}
