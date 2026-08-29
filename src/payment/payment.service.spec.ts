import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Pembayaran Tunai Kasir (createPayment - cash)', () => {
    it('harus langsung berstatus success dan mengupdate payment_status order menjadi paid jika lunas', async () => {
      const mockOrder = {
        id: BigInt(1029),
        totalAmount: new Prisma.Decimal(50000),
        paymentStatus: 'unpaid',
        payments: [],
      };

      const mockCreatedPayment = {
        id: BigInt(1),
        orderId: BigInt(1029),
        method: 'cash',
        amount: new Prisma.Decimal(50000),
        status: 'success',
        referenceNo: 'CASH_123',
        paidAt: new Date(),
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        paymentStatus: 'paid',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: { create: jest.fn().mockResolvedValue(mockCreatedPayment) },
          order: { update: jest.fn().mockResolvedValue(mockUpdatedOrder) },
        });
      });

      const result = await service.createPayment(1029, {
        method: 'cash',
        amount: 50000,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('success');
      expect(result.data.order_payment_status).toBe('paid');
    });

    it('harus melempar BadRequestException jika order sudah lunas', async () => {
      const mockOrder = {
        id: BigInt(1029),
        paymentStatus: 'paid',
        payments: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.createPayment(1029, { method: 'cash', amount: 50000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Pembayaran Digital QRIS (createPayment - qris)', () => {
    it('harus berstatus pending dan mengembalikan qr_code_url', async () => {
      const mockOrder = {
        id: BigInt(1029),
        totalAmount: new Prisma.Decimal(50000),
        paymentStatus: 'unpaid',
        payments: [],
      };

      const mockCreatedPayment = {
        id: BigInt(2),
        orderId: BigInt(1029),
        method: 'qris',
        amount: new Prisma.Decimal(50000),
        status: 'pending',
        referenceNo: 'QRIS_123',
        paidAt: null,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: { create: jest.fn().mockResolvedValue(mockCreatedPayment) },
        });
      });

      const result = await service.createPayment(1029, {
        method: 'qris',
        amount: 50000,
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
      expect(result.data.qr_code_url).toBeDefined();
    });
  });

  describe('3. Webhook Callback Payment Gateway (handleWebhook)', () => {
    it('harus mengupdate status pembayaran menjadi success dan order menjadi paid', async () => {
      const mockPayment = {
        id: BigInt(2),
        orderId: BigInt(1029),
        referenceNo: 'REF_1029',
        status: 'pending',
        amount: new Prisma.Decimal(50000),
        order: {
          totalAmount: new Prisma.Decimal(50000),
          payments: [{ id: BigInt(2), status: 'pending', amount: new Prisma.Decimal(50000) }],
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          payment: { update: jest.fn() },
          order: { update: jest.fn() },
        });
      });

      const result = await service.handleWebhook({
        reference_no: 'REF_1029',
        status: 'success',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('berhasil');
    });

    it('harus melempar NotFoundException jika referensi pembayaran tidak ditemukan', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleWebhook({ reference_no: 'UNKNOWN_REF', status: 'success' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Riwayat Pembayaran (getPaymentsByOrderId)', () => {
    it('harus mengembalikan array pembayaran untuk order tertentu', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          orderId: BigInt(1029),
          method: 'cash',
          amount: new Prisma.Decimal(50000),
          status: 'success',
          referenceNo: 'CASH_1',
          paidAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await service.getPaymentsByOrderId(1029);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(50000);
    });
  });
});
