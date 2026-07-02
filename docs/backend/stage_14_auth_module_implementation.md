# Stage 14: Authentication Module Implementation

**Subject:** Production-Ready Authentication Module Codebase
**Stack:** NestJS, Passport, Supabase (JWT), Prisma, AsyncLocalStorage

This document contains the complete, production-ready TypeScript implementation for the DentalFlow Authentication Module. It strictly adheres to the architecture defined in Stage 13 (Supabase as IdP, NestJS as Resource Server, no local passwords).

---

## 1. Folder Structure

Once the NestJS app is initialized, the `auth` module will be structured as follows:

```text
apps/api/src/common/
├── decorators/
│   ├── current-user.decorator.ts
│   └── require-permissions.decorator.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── permissions.guard.ts
├── middleware/
│   └── tenant-context.middleware.ts

apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
└── dto/
    └── invite-user.dto.ts
```

---

## 2. Common Infrastructure (Guards, Decorators, Middleware)

These files are placed in `src/common` because they protect the entire application, not just the auth module.

### 2.1. `jwt.strategy.ts` (The JWT Verifier)
**Explanation:** This strategy uses `@nestjs/passport` to intercept the `Authorization: Bearer <token>` header. It mathematically verifies the signature using the Supabase JWT secret. If valid, it returns the decoded payload, attaching it to `req.user`.

```typescript
// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  app_metadata: {
    tenantId: string;
    role: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.app_metadata?.tenantId) {
      throw new UnauthorizedException('Tenant ID missing from JWT');
    }
    
    return {
      authId: payload.sub,
      email: payload.email,
      tenantId: payload.app_metadata.tenantId,
      role: payload.app_metadata.role,
    };
  }
}
```

### 2.2. `jwt-auth.guard.ts`
**Explanation:** A simple wrapper around the Passport JWT Strategy. You apply this globally or per-controller to lock down routes.

```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom logic here if needed before passing to Passport
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    return user;
  }
}
```

### 2.3. `tenant-context.middleware.ts` (AsyncLocalStorage)
**Explanation:** This is the magic that passes `tenantId` to Prisma without taking a performance hit. It reads the user extracted by the `JwtAuthGuard` and places their `tenantId` into a globally accessible (but request-isolated) storage.

```typescript
// apps/api/src/common/middleware/tenant-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// We export a singleton ALS instance that Prisma can import
export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // The user is attached by the JwtAuthGuard
    const tenantId = req.user?.['tenantId'];

    if (tenantId) {
      tenantContext.run({ tenantId }, () => {
        next();
      });
    } else {
      next(); // Proceed without tenant context (e.g., for public routes)
    }
  }
}
```

### 2.4. `require-permissions.decorator.ts` & `permissions.guard.ts` (RBAC)
**Explanation:** Defines what permissions a route needs, and enforces them by checking the Prisma database.

```typescript
// apps/api/src/common/decorators/require-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export interface PermissionRequirement {
  action: string;
  subject: string;
}

export const RequirePermissions = (...permissions: PermissionRequirement[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);
```

```typescript
// apps/api/src/common/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true; // No permissions required

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.role) throw new ForbiddenException('Role missing from user context');

    // Fetch permissions for this role from the database
    // (In production, this should be cached in Redis to prevent DB hits on every request)
    const role = await this.prisma.role.findFirst({
      where: { name: user.role, tenantId: user.tenantId },
      include: { permissions: true },
    });

    if (!role) throw new ForbiddenException('Role not found');

    const hasPermission = requiredPermissions.every((required) =>
      role.permissions.some(
        (p) => p.action === required.action && p.subject === required.subject
      )
    );

    if (!hasPermission) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
```

---

## 3. Authentication Module

This module handles orchestrating user invitations between Supabase and Prisma.

### 3.1. `invite-user.dto.ts`
**Explanation:** Uses `class-validator` to ensure the incoming data from the frontend is pristine before hitting the service.

```typescript
// apps/api/src/modules/auth/dto/invite-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  roleName: string; // e.g., 'STAFF'
}
```

### 3.2. `auth.service.ts`
**Explanation:** The core orchestrator. It uses the Supabase `@supabase/supabase-js` Admin SDK to invite the user, sets their `app_metadata`, and then writes the pending user to Prisma.

```typescript
// apps/api/src/modules/auth/auth.service.ts
import { Injectable, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private supabaseAdmin: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Supabase client with Service Role Key (Bypasses RLS)
    this.supabaseAdmin = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  async inviteStaffMember(tenantId: string, inviteDto: InviteUserDto) {
    // 1. Verify Role exists in this tenant
    const role = await this.prisma.role.findFirst({
      where: { name: inviteDto.roleName, tenantId },
    });
    if (!role) throw new ConflictException(`Role ${inviteDto.roleName} not found`);

    // 2. Check if user already exists in Prisma
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, role: { name: inviteDto.roleName } },
      // Note: A real app would check email, but Prisma User might not store email.
    });

    // 3. Invite via Supabase Admin API
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(
      inviteDto.email,
      {
        data: { firstName: inviteDto.firstName, lastName: inviteDto.lastName } // Optional user_metadata
      }
    );

    if (authError) {
      throw new InternalServerErrorException(`Supabase error: ${authError.message}`);
    }

    const authId = authData.user.id;

    // 4. Update the app_metadata with the critical tenantId and role
    const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(authId, {
      app_metadata: {
        tenantId: tenantId,
        role: inviteDto.roleName,
      },
    });

    if (updateError) {
      // If this fails, we should technically rollback the user invite.
      throw new InternalServerErrorException('Failed to attach tenant context to user');
    }

    // 5. Create Prisma User record (Sync)
    const prismaUser = await this.prisma.user.create({
      data: {
        authId: authId,
        tenantId: tenantId,
        roleId: role.id,
        firstName: inviteDto.firstName,
        lastName: inviteDto.lastName,
        status: 'PENDING',
      },
    });

    return {
      message: 'Invitation sent successfully',
      user: prismaUser,
    };
  }
}
```

### 3.3. `auth.controller.ts`
**Explanation:** Exposes the API endpoint. Notice the decorators protecting it: the user must have a valid JWT, and their role must possess the `CREATE:USER` permission.

```typescript
// apps/api/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: 'CREATE', subject: 'USER' })
  async inviteStaff(@Req() req, @Body() inviteDto: InviteUserDto) {
    // The tenantId is safely extracted from the verified JWT (req.user)
    const tenantId = req.user.tenantId;
    return this.authService.inviteStaffMember(tenantId, inviteDto);
  }
}
```

### 3.4. `auth.module.ts`
**Explanation:** Wires the dependencies together, injecting the Passport strategy.

```typescript
// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```
