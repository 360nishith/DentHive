import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((promises) => Promise.all(promises)),
          },
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should throw ConflictException if phone exists in clinic', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.create('tenant-1', { firstName: 'A', lastName: 'B', phone: '+1234', dateOfBirth: '2000-01-01' })
      ).rejects.toThrow(ConflictException);
    });

    it('should create patient successfully', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.patient, 'create').mockResolvedValue({ id: 'new-pat' } as any);

      const result = await service.create('tenant-1', { firstName: 'A', lastName: 'B', phone: '+1234', dateOfBirth: '2000-01-01' });
      expect(result.id).toBe('new-pat');
    });
  });

  describe('findOne', () => {
    it('should use findFirst to prevent Prisma Extension runtime crashes', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue({ id: 'pat-1' } as any);
      
      const result = await service.findOne('pat-1');
      expect(result.id).toBe('pat-1');
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({ where: { id: 'pat-1' } });
    });
  });

  describe('update', () => {
    it('should throw ConflictException if new phone belongs to someone else', async () => {
      jest.spyOn(prisma.patient, 'findFirst')
        .mockResolvedValueOnce({ id: 'pat-1', phone: '+old' } as any) // Mock findOne (which now uses findFirst)
        .mockResolvedValueOnce({ id: 'pat-2' } as any); // Mock Duplicate check

      await expect(
        service.update('pat-1', { phone: '+new' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('should change status to ARCHIVED', async () => {
      jest.spyOn(prisma.patient, 'findFirst').mockResolvedValue({ id: 'pat-1' } as any);
      jest.spyOn(prisma.patient, 'update').mockResolvedValue({ id: 'pat-1', status: 'ARCHIVED' } as any);

      const result = await service.archive('pat-1');
      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat-1' },
        data: { status: 'ARCHIVED' },
      });
    });
  });
});
