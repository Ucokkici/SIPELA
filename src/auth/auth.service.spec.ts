import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    employee: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
    sign: jest.fn().mockReturnValue('mocked_jwt_token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test_jwt_secret';
        case 'JWT_REFRESH_SECRET':
          return 'test_refresh_secret';
        case 'JWT_EXPIRES_IN':
          return '1d';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Login Pegawai (login)', () => {
    it('harus sukses login dan mengembalikan tokens jika email dan password valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockEmployee = {
        id: BigInt(1),
        fullName: 'Kasir Satu',
        email: 'kasir@cabang1.com',
        password: hashedPassword,
        role: 'kasir',
        status: 'active',
        tenantId: BigInt(10),
        branchId: BigInt(1),
      };

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      const result = await service.login({
        email: 'kasir@cabang1.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data.role).toBe('kasir');
      expect(result.data.access_token).toBe('mocked_jwt_token');
      expect(result.data.user.id).toBe(1);
    });

    it('harus melempar UnauthorizedException jika password salah', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockEmployee = {
        id: BigInt(1),
        fullName: 'Kasir Satu',
        email: 'kasir@cabang1.com',
        password: hashedPassword,
        role: 'kasir',
        status: 'active',
        tenantId: BigInt(10),
        branchId: BigInt(1),
      };

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      await expect(
        service.login({
          email: 'kasir@cabang1.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('harus melempar UnauthorizedException jika akun tidak aktif/suspended', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockEmployee = {
        id: BigInt(1),
        fullName: 'Kasir Satu',
        email: 'kasir@cabang1.com',
        password: hashedPassword,
        role: 'kasir',
        status: 'suspended',
        tenantId: BigInt(10),
        branchId: BigInt(1),
      };

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      await expect(
        service.login({
          email: 'kasir@cabang1.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('harus melempar UnauthorizedException jika email tidak ditemukan', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. Refresh Token (refreshToken)', () => {
    it('harus menghasilkan token baru jika refresh token valid', async () => {
      const mockEmployee = {
        id: BigInt(1),
        email: 'kasir@cabang1.com',
        role: 'kasir',
        status: 'active',
        tenantId: BigInt(10),
        branchId: BigInt(1),
      };

      mockJwtService.verify.mockReturnValue({
        sub: 1,
        email: 'kasir@cabang1.com',
      });
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      const result = await service.refreshToken({
        refresh_token: 'valid_refresh_token',
      });

      expect(result.success).toBe(true);
      expect(result.data.access_token).toBe('mocked_jwt_token');
    });

    it('harus melempar UnauthorizedException jika refresh token invalid/expired', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshToken({
          refresh_token: 'expired_refresh_token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Profil Pengguna (getProfile)', () => {
    it('harus mengembalikan profil employee tanpa menyertakan password hash', async () => {
      const mockEmployee = {
        id: BigInt(1),
        fullName: 'Kasir Satu',
        email: 'kasir@cabang1.com',
        password: 'hashed_password_secret',
        role: 'kasir',
      };

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      const result = await service.getProfile(1, 'employee');

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe('Kasir Satu');
      expect((result.data as any).password).toBeUndefined();
    });
  });
});
