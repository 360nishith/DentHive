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
