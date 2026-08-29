import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { WeightVerificationService } from './weight-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeightStatus } from './weight-verification.constants';
import { WeightUnconfirmedException } from './exceptions/weight-unconfirmed.exception';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '@prisma/client';

describe('WeightVerificationService', () => {
  let service: WeightVerificationService;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationService = {
    queueWeightMismatchNotification: jest.fn().mockResolvedValue({ success: true, job_id: 'job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeightVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<WeightVerificationService>(WeightVerificationService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Kalkulasi Toleransi (calculateTolerance)', () => {
    describe('Toleransi Default 10% (Estimasi: 5.0 kg)', () => {
      const estimated = 5.0;
      const tolerancePct = 10.0; // Batas: 4.5 kg s/d 5.5 kg

      it('harus MATCHED jika berat tepat di batas atas toleransi (5.5 kg)', () => {
        const result = service.calculateTolerance(estimated, 5.5, tolerancePct);
        expect(result.weightStatus).toBe(WeightStatus.MATCHED);
        expect(result.isWithinTolerance).toBe(true);
        expect(result.difference).toBe(0.5);
      });

      it('harus MATCHED jika berat tepat di batas bawah toleransi (4.5 kg)', () => {
        const result = service.calculateTolerance(estimated, 4.5, tolerancePct);
        expect(result.weightStatus).toBe(WeightStatus.MATCHED);
        expect(result.isWithinTolerance).toBe(true);
        expect(result.difference).toBe(0.5);
      });

      it('harus MATCHED jika berat berada di dalam rentang toleransi (5.2 kg)', () => {
        const result = service.calculateTolerance(estimated, 5.2, tolerancePct);
        expect(result.weightStatus).toBe(WeightStatus.MATCHED);
        expect(result.isWithinTolerance).toBe(true);
      });

      it('harus MISMATCHED jika berat melebihi batas atas toleransi (5.6 kg)', () => {
        const result = service.calculateTolerance(estimated, 5.6, tolerancePct);
        expect(result.weightStatus).toBe(WeightStatus.MISMATCHED);
        expect(result.isWithinTolerance).toBe(false);
      });

      it('harus MISMATCHED jika berat di bawah batas bawah toleransi (4.4 kg)', () => {
        const result = service.calculateTolerance(estimated, 4.4, tolerancePct);
        expect(result.weightStatus).toBe(WeightStatus.MISMATCHED);
        expect(result.isWithinTolerance).toBe(false);
      });
    });

    describe('Tenant dengan Toleransi Kustom (Custom Tolerance)', () => {
      it('harus mendukung toleransi ketat 5% (Estimasi: 10.0 kg -> batas 9.5 s/d 10.5 kg)', () => {
        const estimated = 10.0;
        const customTolerance = 5.0;

        // 10.5 kg -> MATCHED
        expect(
          service.calculateTolerance(estimated, 10.5, customTolerance).weightStatus,
        ).toBe(WeightStatus.MATCHED);

        // 10.6 kg -> MISMATCHED
        expect(
          service.calculateTolerance(estimated, 10.6, customTolerance).weightStatus,
        ).toBe(WeightStatus.MISMATCHED);
      });

      it('harus mendukung toleransi longgar 15% (Estimasi: 10.0 kg -> batas 8.5 s/d 11.5 kg)', () => {
        const estimated = 10.0;
        const customTolerance = 15.0;

        // 11.5 kg -> MATCHED
        expect(
          service.calculateTolerance(estimated, 11.5, customTolerance).weightStatus,
        ).toBe(WeightStatus.MATCHED);

        // 11.6 kg -> MISMATCHED
        expect(
          service.calculateTolerance(estimated, 11.6, customTolerance).weightStatus,
        ).toBe(WeightStatus.MISMATCHED);
      });
    });

    describe('Kasus Walk-in (estimated_weight kosong / null)', () => {
      it('harus mengembalikan NOT_REQUIRED jika estimated_weight adalah null', () => {
        const result = service.calculateTolerance(null, 7.5);
        expect(result.weightStatus).toBe(WeightStatus.NOT_REQUIRED);
        expect(result.isWithinTolerance).toBe(true);
      });

      it('harus mengembalikan NOT_REQUIRED jika estimated_weight adalah undefined', () => {
        const result = service.calculateTolerance(undefined, 7.5);
        expect(result.weightStatus).toBe(WeightStatus.NOT_REQUIRED);
        expect(result.isWithinTolerance).toBe(true);
      });
    });
  });

  describe('2. Pengecekan Izin Lanjut ke Process (canProceedToProcess & validate)', () => {
    it('harus mengizinkan status MATCHED, CONFIRMED, dan NOT_REQUIRED', () => {
      expect(service.canProceedToProcess(WeightStatus.MATCHED)).toBe(true);
      expect(service.canProceedToProcess(WeightStatus.CONFIRMED)).toBe(true);
      expect(service.canProceedToProcess(WeightStatus.NOT_REQUIRED)).toBe(true);

      expect(() =>
        service.validateCanProceedToProcess(WeightStatus.MATCHED),
      ).not.toThrow();
      expect(() =>
        service.validateCanProceedToProcess(WeightStatus.CONFIRMED),
      ).not.toThrow();
      expect(() =>
        service.validateCanProceedToProcess(WeightStatus.NOT_REQUIRED),
      ).not.toThrow();
    });

    it('harus menolak status MISMATCHED dan PENDING dengan melempar WeightUnconfirmedException (422)', () => {
      expect(service.canProceedToProcess(WeightStatus.MISMATCHED)).toBe(false);
      expect(service.canProceedToProcess(WeightStatus.PENDING)).toBe(false);

      expect(() =>
        service.validateCanProceedToProcess(WeightStatus.MISMATCHED),
      ).toThrow(WeightUnconfirmedException);

      expect(() =>
        service.validateCanProceedToProcess(WeightStatus.PENDING),
      ).toThrow(WeightUnconfirmedException);
    });

    it('harus memiliki format payload exception 422 yang sesuai standar', () => {
      try {
        service.validateCanProceedToProcess(WeightStatus.MISMATCHED);
        fail('Seharusnya melempar WeightUnconfirmedException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(WeightUnconfirmedException);
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

        const response = error.getResponse();
        expect(response.error.code).toBe('WEIGHT_NOT_CONFIRMED');
        expect(response.error.details.weight_status).toBe(WeightStatus.MISMATCHED);
      }
    });
  });

  describe('3. Kasir Input Berat (verifyAndApplyWeight)', () => {
    it('harus melempar NotFoundException jika order tidak ditemukan', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAndApplyWeight(999, { actual_weight: 5.0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus sukses mencatat status MATCHED dan rekalkulasi harga saat timbangan sesuai', async () => {
      const mockOrder = {
        id: BigInt(1029),
        estimatedWeight: new Prisma.Decimal(5.0),
        discountAmount: new Prisma.Decimal(0),
        courierFee: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        tenant: { weightTolerancePercent: new Prisma.Decimal(10.0) },
        items: [
          {
            id: BigInt(1),
            price: new Prisma.Decimal(10000),
            quantity: new Prisma.Decimal(5),
            subtotal: new Prisma.Decimal(50000),
          },
        ],
      };

      const updatedOrder = {
        id: BigInt(1029),
        actualWeight: new Prisma.Decimal(5.2),
        weightStatus: WeightStatus.MATCHED,
        totalAmount: new Prisma.Decimal(52000),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          orderItem: { update: jest.fn() },
          order: { update: jest.fn().mockResolvedValue(updatedOrder) },
        });
      });

      const result = await service.verifyAndApplyWeight(1029, {
        actual_weight: 5.2,
      });

      expect(result.success).toBe(true);
      expect(result.data.weight_status).toBe(WeightStatus.MATCHED);
      expect(result.data.notification_sent).toBe(false);
      expect(result.data.actual_weight).toBe(5.2);
    });

    it('harus mencatat MISMATCHED dan notification_sent=true saat timbangan di luar batas', async () => {
      const mockOrder = {
        id: BigInt(1029),
        estimatedWeight: new Prisma.Decimal(5.0),
        discountAmount: new Prisma.Decimal(0),
        courierFee: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        tenant: { weightTolerancePercent: new Prisma.Decimal(10.0) },
        items: [
          {
            id: BigInt(1),
            price: new Prisma.Decimal(10000),
            quantity: new Prisma.Decimal(5),
            subtotal: new Prisma.Decimal(50000),
          },
        ],
      };

      const updatedOrder = {
        id: BigInt(1029),
        actualWeight: new Prisma.Decimal(6.8),
        weightStatus: WeightStatus.MISMATCHED,
        totalAmount: new Prisma.Decimal(68000),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          orderItem: { update: jest.fn() },
          order: { update: jest.fn().mockResolvedValue(updatedOrder) },
        });
      });

      const result = await service.verifyAndApplyWeight(1029, {
        actual_weight: 6.8,
      });

      expect(result.success).toBe(true);
      expect(result.data.weight_status).toBe(WeightStatus.MISMATCHED);
      expect(result.data.notification_sent).toBe(true);
      expect(result.data.total_amount).toBe(68000);
    });
  });

  describe('4. Konfirmasi Berat Pelanggan (confirmWeight)', () => {
    it('harus memperbarui weight_status menjadi CONFIRMED dan mengisi weight_confirmed_at saat confirmed=true', async () => {
      const now = new Date();
      const mockOrder = {
        id: BigInt(1029),
        weightStatus: WeightStatus.MISMATCHED,
      };

      const updatedOrder = {
        id: BigInt(1029),
        weightStatus: WeightStatus.CONFIRMED,
        weightConfirmedAt: now,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.confirmWeight(1029, { confirmed: true });

      expect(result.success).toBe(true);
      expect(result.data.weight_status).toBe(WeightStatus.CONFIRMED);
      expect(result.data.weight_confirmed_at).toEqual(now);
    });
  });
});
