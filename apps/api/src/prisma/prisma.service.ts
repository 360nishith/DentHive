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

          // Skip isolation for internal/webhook operations where tenantId is explicitly null or injected manually
          if (!tenantId) {
            return query(args);
          }

          // If the model doesn't have a tenantId field (e.g. system tables), skip
          // For simplicity, we assume models that should be isolated have tenantId in their Prisma schema.
          // Forcefully inject where: { tenantId }
          args.where = { ...args.where, tenantId };
          
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
