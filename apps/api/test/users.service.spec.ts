import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  station: { findMany: jest.fn() },
  userStation: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deberia crear un usuario nuevo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'test@test.cl',
        name: 'Test',
        role: 'SOUS_CHEF',
      });

      const result = await service.create({
        email: 'test@test.cl',
        password: 'pass123',
        name: 'Test',
        role: 'SOUS_CHEF' as any,
        organizationId: 'org1',
      });

      expect(result.id).toBe('u1');
      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
    });

    it('deberia lanzar ConflictException si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          email: 'existing@test.cl',
          password: 'pass123',
          name: 'Test',
          role: 'SOUS_CHEF' as any,
          organizationId: 'org1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllForCurrentUser', () => {
    it('deberia retornar usuarios de la misma organizacion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ organizationId: 'org1' });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', name: 'Ana' },
        { id: 'u2', name: 'Carlos' },
      ]);

      const result = await service.findAllForCurrentUser('u1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org1' },
        }),
      );
    });

    it('deberia lanzar NotFoundException si el usuario actual no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findAllForCurrentUser('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('deberia retornar un usuario existente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Test',
        stations: [],
      });

      const result = await service.findOne('u1');

      expect(result.id).toBe('u1');
    });

    it('deberia lanzar NotFoundException si no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deberia actualizar nombre del usuario', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', stations: [] });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Nuevo Nombre',
      });

      const result = await service.update('u1', { name: 'Nuevo Nombre' });

      expect(result.name).toBe('Nuevo Nombre');
    });

    it('deberia hashear password si se proporciona', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', stations: [] });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await service.update('u1', { password: 'newpass' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    });

    it('deberia lanzar NotFoundException si no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('bad', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deberia soft-delete (isActive=false) y limpiar refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', stations: [] });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        isActive: false,
      });

      const result = await service.remove('u1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false, refreshToken: null },
        }),
      );
    });
  });

  describe('assignStations', () => {
    it('deberia asignar estaciones al usuario', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', stations: [] }) // findOne check
        .mockResolvedValueOnce({ id: 'u1', stations: [{ station: { id: 'st1' } }] }); // return after assign
      mockPrisma.station.findMany.mockResolvedValue([{ id: 'st1' }]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.assignStations('u1', ['st1']);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('deberia lanzar NotFoundException si alguna estacion no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', stations: [] });
      mockPrisma.station.findMany.mockResolvedValue([]); // none found

      await expect(
        service.assignStations('u1', ['nonexistent']),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
