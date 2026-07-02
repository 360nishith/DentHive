import { Injectable, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicCreatedEvent } from '../clinics/events/clinic-events';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService
  ) {}

  async onboardNewTenant(dto: OnboardTenantDto) {
    const isCaptchaValid = await this.verifyCaptcha(dto.captchaToken);
    if (!isCaptchaValid) {
      this.logger.warn(`Onboarding rejected: Invalid or failed CAPTCHA for email ${dto.email}`);
      throw new UnauthorizedException('Invalid CAPTCHA token');
    }

    let authId: string;
    try {
      authId = await this.supabase.createUser(dto.email, dto.password);
    } catch (error) {
      throw new InternalServerErrorException('Registration failed at Identity Provider');
    }

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const tenant = await tx.tenant.create({
          data: { status: 'TRIAL' }
        });

        let ownerRole = await tx.role.findUnique({ where: { name: 'OWNER' } });
        if (!ownerRole) {
          ownerRole = await tx.role.create({ data: { name: 'OWNER' } });
        }

        const clinic = await tx.clinic.create({
          data: {
            tenantId: tenant.id,
            name: dto.clinicName,
            address: 'Pending Address',
            phone: 'Pending Phone',
            email: dto.email
          }
        });

        await tx.user.create({
          data: {
            authId,
            tenantId: tenant.id,
            roleId: ownerRole.id,
            firstName: 'Admin',
            lastName: 'User',
            status: 'ACTIVE'
          }
        });

        return { tenant, clinic };
      });

      await this.supabase.updateUserMetadata(authId, {
        tenantId: result.tenant.id,
        role: 'OWNER'
      });

      this.eventEmitter.emit('clinic.created', new ClinicCreatedEvent(result.tenant.id, result.clinic.id));
      return { tenantId: result.tenant.id, clinicId: result.clinic.id };

    } catch (error) {
      this.logger.error(`Rollback needed for AuthID ${authId}`, error.stack);
      await this.supabase.deleteUser(authId);
      throw new InternalServerErrorException('Database provisioning failed. Account wiped.');
    }
  }

  private async verifyCaptcha(token: string): Promise<boolean> {
    const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) {
      this.logger.error('RECAPTCHA_SECRET_KEY is not configured in the environment variables. Failing closed.');
      return false; // Fail closed
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000); // 5-second timeout protection

    try {
      this.logger.debug('Initiating HTTP request to reCAPTCHA provider');
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}`,
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();
      
      if (data.success === true) {
        this.logger.log('reCAPTCHA verification successful');
        return true;
      } else {
        this.logger.warn({
          message: 'reCAPTCHA verification failed',
          errorCodes: data['error-codes']
        });
        return false;
      }
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        this.logger.error('reCAPTCHA validation timed out after 5000ms. Failing closed.');
      } else {
        this.logger.error('Network error communicating with reCAPTCHA provider. Failing closed.', error.stack);
      }
      
      return false; // Fail closed on any network error or timeout
    }
  }
}
