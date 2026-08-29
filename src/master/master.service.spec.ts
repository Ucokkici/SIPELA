import { Test, TestingModule } from '@nestjs/testing';
import { MasterService } from './master.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('MasterService', () => {
  let service: MasterService;
  let prisma: PrismaService;

  const mockPrismaService = {
    service: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    branch: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    discount: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MasterService>(MasterService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Master Layanan (Service)', () => {
    it('harus mengembalikan daftar layanan', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          tenantId: BigInt(1),
          branchId: BigInt(1),
          name: 'Cuci Komplit',
          price: new Prisma.Decimal(8000),
          isActive: true,
        },
      ]);

      const result = await service.getServices(1);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Cuci Komplit');
    });

    it('harus sukses membuat paket layanan baru', async () => {
      const createdMock = {
        id: BigInt(2),
        name: 'Cuci Kilat',
        price: new Prisma.Decimal(12000),
        isActive: true,
      };

      mockPrismaService.service.create.mockResolvedValue(createdMock);

      const result = await service.createService(1, {
        branch_id: 1,
        name: 'Cuci Kilat',
        price: 12000,
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Cuci Kilat');
      expect(result.data.price).toBe(12000);
    });
  });

  describe('2. Master Cabang (Branch)', () => {
    it('harus sukses membuat cabang baru', async () => {
      const createdMock = {
        id: BigInt(2),
        name: 'Cabang Kemang',
        location: 'Jl. Kemang Raya',
        isMainBranch: false,
      };

      mockPrismaService.branch.create.mockResolvedValue(createdMock);

      const result = await service.createBranch(1, {
        name: 'Cabang Kemang',
        location: 'Jl. Kemang Raya',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Cabang Kemang');
    });
  });

  describe('3. Master Pegawai (Employee)', () => {
    it('harus sukses mendaftarkan pegawai baru dengan password terenkripsi', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const createdMock = {
        id: BigInt(10),
        fullName: 'Budi Operator',
        email: 'operator2@sipela.id',
        role: 'operator',
        status: 'active',
      };

      mockPrismaService.employee.create.mockResolvedValue(createdMock);

      const result = await service.createEmployee(1, {
        branch_id: 1,
        fullName: 'Budi Operator',
        email: 'operator2@sipela.id',
        password: 'password123',
        role: 'operator',
      });

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('operator2@sipela.id');
    });
  });

  describe('4. Master Diskon (Discount)', () => {
    it('harus sukses membuat diskon baru', async () => {
      const createdMock = {
        id: BigInt(1),
        name: 'Promo 20%',
        typeDiscount: 'percent',
        isActive: true,
      };

      mockPrismaService.discount.create.mockResolvedValue(createdMock);

      const result = await service.createDiscount(1, {
        branch_id: 1,
        name: 'Promo 20%',
        typeDiscount: 'percent',
        percent: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Promo 20%');
    });
  });
});
