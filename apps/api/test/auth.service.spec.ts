import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@test.cl', password: 'password123' };

    it('deberia lanzar UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deberia lanzar UnauthorizedException si el usuario esta inactivo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        isActive: false,
        password: 'hashed',
        stations: [],
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deberia lanzar UnauthorizedException si la password es invalida', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        isActive: true,
        password: 'hashed',
        role: 'ADMIN',
        stations: [],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deberia retornar tokens y user data con login valido', async () => {
      const mockUser = {
        id: '1',
        email: loginDto.email,
        name: 'Test User',
        isActive: true,
        password: 'hashed',
        role: 'ADMIN',
        organizationId: 'org1',
        stations: [
          { station: { id: 'st1', name: 'Montaje' } },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('1');
      expect(result.user.role).toBe('admin');
      expect(result.user.stations).toHaveLength(1);
    });
  });

  describe('getMe', () => {
    it('deberia lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deberia retornar user data con role mapeado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.cl',
        name: 'Test',
        isActive: true,
        role: 'HEAD_CHEF',
        organizationId: 'org1',
        stations: [],
      });

      const result = await service.getMe('1');

      expect(result.role).toBe('supervisor');
      expect(result.id).toBe('1');
    });
  });

  describe('logout', () => {
    it('deberia limpiar el refresh token del usuario', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.logout('1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { refreshToken: null },
      });
    });
  });
});
