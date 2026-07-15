import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { als } from '../context/als';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | undefined;
    let userId: string | undefined; // Supabase authId
    let dbUserId: string | undefined; // Postgres User.id
    let role: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.decode(token);
        if (decoded) {
          tenantId = decoded.app_metadata?.tenantId;
          userId = decoded.sub;
          role = decoded.app_metadata?.role;

          // Lookup Postgres dbUserId if user is authenticated
          if (userId) {
            const user = await this.prisma.user.findUnique({
              where: { authId: userId },
              select: { id: true }
            });
            if (user) {
              dbUserId = user.id;
            }
          }
        }
      } catch (e) {
        // Token parsing failed, ignore
      }
    }

    als.run({ tenantId, userId: dbUserId || userId, role }, () => {
      next();
    });
  }
}
