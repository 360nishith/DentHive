import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS = 'REQUIRE_PERMISSIONS';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRE_PERMISSIONS, permissions);
