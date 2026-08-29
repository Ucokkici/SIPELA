import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
    },
    branch: {
      findMany: jest.fn(),
    },
    courier: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Laporan Omzet (getRevenueReport)', () => {
    it('harus menghitung total omzet dan breakdown metode pembayaran secara akurat', async () => {
      const mockOrders = [
        {
          id: BigInt(1),
          status: 'done',
          totalAmount: new Prisma.Decimal(50000),
          payments: [
            { method: 'cash', amount: new Prisma.Decimal(50000), status: 'success' },
          ],
        },
        {
          id: BigInt(2),
          status: 'process',
          totalAmount: new Prisma.Decimal(75000),
          payments: [
            { method: 'qris', amount: new Prisma.Decimal(75000), status: 'success' },
          ],
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getRevenueReport(1, {});

      expect(result.success).toBe(true);
      expect(result.data.summary.total_revenue).toBe(125000);
      expect(result.data.summary.total_orders).toBe(2);
      expect(result.data.summary.completed_orders).toBe(1);
      expect(result.data.payment_methods.cash).toBe(50000);
      expect(result.data.payment_methods.qris).toBe(75000);
    });
  });

  describe('2. Performa Cabang (getBranchPerformance)', () => {
    it('harus mengagregasi omzet dan jumlah order per cabang', async () => {
      const mockBranches = [
        {
          id: BigInt(1),
          name: 'Cabang Tebet',
          location: 'Jl. Tebet Raya',
          isMainBranch: true,
          orders: [
            {
              status: 'done',
              payments: [{ amount: new Prisma.Decimal(100000), status: 'success' }],
            },
          ],
          employees: [{ id: BigInt(1) }, { id: BigInt(2) }],
        },
      ];

      mockPrismaService.branch.findMany.mockResolvedValue(mockBranches);

      const result = await service.getBranchPerformance(1, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].branch_name).toBe('Cabang Tebet');
      expect(result.data[0].total_revenue).toBe(100000);
      expect(result.data[0].total_employees).toBe(2);
    });
  });

  describe('3. Statistik Kurir (getCourierStatistics)', () => {
    it('harus mengembalikan jumlah ping GPS kurir', async () => {
      const mockCouriers = [
        {
          id: BigInt(1),
          name: 'Kurir Budi',
          phone: '08123456789',
          vehicleType: 'motor',
          plateNumber: 'B 1234 ABC',
          status: 'active',
          locationLogs: [{ id: BigInt(1) }, { id: BigInt(2) }, { id: BigInt(3) }],
        },
      ];

      mockPrismaService.courier.findMany.mockResolvedValue(mockCouriers);

      const result = await service.getCourierStatistics(1, {});

      expect(result.success).toBe(true);
      expect(result.data[0].name).toBe('Kurir Budi');
      expect(result.data[0].total_gps_pings).toBe(3);
    });
  });
});
