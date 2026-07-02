# STAGE 15 — Authentication Module Implementation

**Subject:** Production-Ready Authentication Source Code
**Stack:** NestJS, Prisma, TypeScript Strict Mode, Jest

---

## 1. DTOs (Data Transfer Objects)

### `src/modules/auth/dto/invite-user.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
```
*   **Purpose:** Validates the incoming payload when a clinic admin invites a new staff member.
*   **Dependencies:** `class-validator` for strict runtime checking.
*   **Security Considerations:** Strict type checking and max lengths prevent buffer overflows and NoSQL-style injection payloads. Unrecognized keys will be stripped globally by NestJS `ValidationPipe`.

---

## 2. Decorators

### `src/common/decorators/current-user.decorator.ts`
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  authId: string;
  tenantId: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Appended by the JwtAuthGuard
  },
);
```
*   **Purpose:** Provides a clean way to extract the verified user object inside controllers without injecting the entire Express `Request` object.
*   **Dependencies:** NestJS core.
*   **Security Considerations:** Assumes that the route is already protected by `JwtAuthGuard`. If used on an unprotected route, it will return `undefined`.

---

## 3. Strategies & Guards

### `src/modules/auth/strategies/jwt.strategy.ts`
```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<AuthenticatedUser> {
    const tenantId = payload.app_metadata?.tenantId;
    const role = payload.app_metadata?.role;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing from token');
    }

    return {
      authId: payload.sub,
      tenantId: tenantId,
      role: role,
    };
  }
}
```
*   **Purpose:** Verifies the cryptographic signature of the JWT issued by Supabase.
*   **Dependencies:** `@nestjs/passport`, `passport-jwt`, `@nestjs/config`.
*   **Security Considerations:** Uses HMAC SHA-256 verification via `secretOrKey`. Fails instantly if the token is expired or if the signature was tampered with.

---

## 4. Third-Party Integrations

### `src/modules/supabase/supabase.service.ts`
```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.adminClient = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  async inviteUser(email: string): Promise<string> {
    const { data, error } = await this.adminClient.auth.admin.inviteUserByEmail(email);
    if (error) throw new InternalServerErrorException(error.message);
    return data.user.id;
  }

  async updateUserMetadata(authId: string, metadata: { tenantId: string; role: string }): Promise<void> {
    const { error } = await this.adminClient.auth.admin.updateUserById(authId, {
      app_metadata: metadata,
    });
    if (error) throw new InternalServerErrorException('Failed to sync tenant context');
  }
}
```
*   **Purpose:** Wrapper around the Supabase Admin SDK. Isolates all external network calls for identity management.
*   **Dependencies:** `@supabase/supabase-js`.
*   **Security Considerations:** Uses the `SERVICE_ROLE_KEY` which bypasses all RLS in Supabase. This service must *never* be exposed directly to controllers.

---

## 5. Services (Business Logic)

### `src/modules/auth/auth.service.ts`
```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async inviteStaff(tenantId: string, dto: InviteUserDto) {
    // 1. Verify Role belongs to Tenant
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, tenantId },
    });
    
    if (!role) {
      throw new NotFoundException('Role not found within your clinic');
    }

    // 2. Trigger Supabase Invite
    const authId = await this.supabase.inviteUser(dto.email);

    // 3. Inject Tenant Context into Identity Vault
    await this.supabase.updateUserMetadata(authId, {
      tenantId: tenantId,
      role: role.name,
    });

    // 4. Create local DB reference
    const user = await this.prisma.user.create({
      data: {
        authId,
        tenantId,
        roleId: role.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'PENDING',
      },
    });

    return user;
  }
}
```
*   **Purpose:** Orchestrates the multi-system sync between Supabase Identity and the Prisma Database.
*   **Dependencies:** `PrismaService`, `SupabaseService`.
*   **Security Considerations:** Explicitly queries `tenantId` when verifying the `roleId` to ensure an attacker cannot assign a higher-privileged role from a different clinic.

---

## 6. Controllers

### `src/modules/auth/auth.controller.ts`
```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invite')
  async inviteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inviteDto: InviteUserDto,
  ) {
    // Rely strictly on the JWT tenantId, completely ignoring frontend headers
    return this.authService.inviteStaff(user.tenantId, inviteDto);
  }
}
```
*   **Purpose:** Exposes the REST API for inviting users.
*   **Dependencies:** `AuthService`, `JwtAuthGuard`.
*   **Security Considerations:** Protects the route via `JwtAuthGuard`. It does not accept `tenantId` from the `@Body()` or headers; it extracts it exclusively from the cryptographically verified `@CurrentUser()`.

---

## 7. Unit Tests

### `src/modules/auth/auth.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let supabase: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            role: { findFirst: jest.fn() },
            user: { create: jest.fn() },
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            inviteUser: jest.fn(),
            updateUserMetadata: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    supabase = module.get<SupabaseService>(SupabaseService);
  });

  it('should throw NotFoundException if role does not belong to tenant', async () => {
    jest.spyOn(prisma.role, 'findFirst').mockResolvedValue(null);

    await expect(
      service.inviteStaff('tenant-1', { email: 'a@b.com', firstName: 'A', lastName: 'B', roleId: 'role-1' })
    ).rejects.toThrow(NotFoundException);
    
    expect(supabase.inviteUser).not.toHaveBeenCalled();
  });

  it('should successfully orchestrate an invite', async () => {
    jest.spyOn(prisma.role, 'findFirst').mockResolvedValue({ id: 'role-1', name: 'STAFF', tenantId: 'tenant-1' } as any);
    jest.spyOn(supabase, 'inviteUser').mockResolvedValue('auth-123');
    jest.spyOn(prisma.user, 'create').mockResolvedValue({ id: 'user-1' } as any);

    const result = await service.inviteStaff('tenant-1', {
      email: 'a@b.com', firstName: 'A', lastName: 'B', roleId: 'role-1'
    });

    expect(supabase.inviteUser).toHaveBeenCalledWith('a@b.com');
    expect(supabase.updateUserMetadata).toHaveBeenCalledWith('auth-123', { tenantId: 'tenant-1', role: 'STAFF' });
    expect(result.id).toBe('user-1');
  });
});
```
*   **Purpose:** Ensures the orchestration logic executes in the correct order and fails safely if tampering occurs.
*   **Dependencies:** Jest, `@nestjs/testing`.
*   **Security Considerations:** Specifically verifies that the Supabase Admin API is *never* called if the Role validation check fails, preventing phantom users from polluting the Identity Provider if an attack is detected.
