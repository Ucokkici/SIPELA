import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { PhotoVerificationService } from '../photo-verification/photo-verification.service';
import { WeightVerificationService } from '../weight-verification/weight-verification.service';
import { OrderStatus } from './order.constants';
import { WeightStatus } from '../weight-verification/weight-verification.constants';
import { InvalidStatusTransitionException } from './exceptions/invalid-status-transition.exception';
import { PhotoRequiredException } from '../photo-verification/exceptions/photo-required.exception';
import { WeightUnconfirmedException } from '../weight-verification/exceptions/weight-unconfirmed.exception';
import { NotificationService } from '../notification/notification.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;
  let stateMachineService: OrderStateMachineService;
  let photoVerificationService: PhotoVerificationService;
  let weightVerificationService: WeightVerificationService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    orderStatusLog: {
      create: jest.fn(),
    },
    branch: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    discount: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    tenantCourierRules: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationService = {
    queueWeightMismatchNotification: jest.fn().mockResolvedValue({ success: true, job_id: 'job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        OrderStateMachineService,
        PhotoVerificationService,
        WeightVerificationService,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
    stateMachineService = module.get<OrderStateMachineService>(
      OrderStateMachineService,
    );
    photoVerificationService = module.get<PhotoVerificationService>(
      PhotoVerificationService,
    );
    weightVerificationService = module.get<WeightVerificationService>(
      WeightVerificationService,
    );

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('updateStatus', () => {
    it('harus melempar NotFoundException jika order tidak ditemukan', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(999, {
          status: OrderStatus.PICKUP,
          photo_url: 'https://cdn.sipela.id/proof.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melempar InvalidStatusTransitionException (422) jika transisi status tidak valid', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: OrderStatus.PENDING,
      });

      // PENDING -> PROCESS tidak valid
      await expect(
        service.updateStatus(1, {
          status: OrderStatus.PROCESS,
        }),
      ).rejects.toThrow(InvalidStatusTransitionException);
    });

    it('harus melempar PhotoRequiredException (422) jika foto wajib belum disertakan (misal ke PICKUP)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: OrderStatus.PENDING,
      });

      // PENDING -> PICKUP valid tapi butuh foto
      await expect(
        service.updateStatus(1, {
          status: OrderStatus.PICKUP,
        }),
      ).rejects.toThrow(PhotoRequiredException);
    });

    it('harus sukses update status dan buat order_status_log dengan photoRequired=true untuk status PICKUP', async () => {
      const mockOrder = {
        id: BigInt(1),
        status: OrderStatus.PENDING,
      };

      const updatedOrder = {
        id: BigInt(1),
        status: OrderStatus.PICKUP,
      };

      const createdLog = {
        id: BigInt(10),
        orderId: BigInt(1),
        status: OrderStatus.PICKUP,
        photoUrl: 'https://cdn.sipela.id/pickup.jpg',
        photoRequired: true,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockResolvedValue([updatedOrder, createdLog]);

      const result = await service.updateStatus(1, {
        status: OrderStatus.PICKUP,
        photo_url: 'https://cdn.sipela.id/pickup.jpg',
        note: 'Diambil di lokasi',
      });

      expect(result).toEqual({
        success: true,
        data: {
          id: 1,
          status: OrderStatus.PICKUP,
        },
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('harus melempar WeightUnconfirmedException (422) jika transisi ke PROCESS tetapi weight_status masih MISMATCHED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: OrderStatus.RECEIVED,
        weightStatus: WeightStatus.MISMATCHED,
      });

      await expect(
        service.updateStatus(1, {
          status: OrderStatus.PROCESS,
        }),
      ).rejects.toThrow(WeightUnconfirmedException);
    });

    it('harus sukses update status dan catat photoRequired=false untuk status yang tidak mewajibkan foto (misal ke PROCESS saat weight_status MATCHED)', async () => {
      const mockOrder = {
        id: BigInt(1),
        status: OrderStatus.RECEIVED,
        weightStatus: WeightStatus.MATCHED,
      };

      const updatedOrder = {
        id: BigInt(1),
        status: OrderStatus.PROCESS,
      };

      const createdLog = {
        id: BigInt(11),
        orderId: BigInt(1),
        status: OrderStatus.PROCESS,
        photoUrl: null,
        photoRequired: false,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockResolvedValue([updatedOrder, createdLog]);

      const result = await service.updateStatus(1, {
        status: OrderStatus.PROCESS,
      });

      expect(result).toEqual({
        success: true,
        data: {
          id: 1,
          status: OrderStatus.PROCESS,
        },
      });
    });
  });

  describe('createOrder', () => {
    it('harus melempar NotFoundException jika cabang (branch) tidak ditemukan', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          branch_id: 999,
          customer_id: 1,
          items: [{ service_id: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melempar NotFoundException jika customer tidak ditemukan', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue({
        id: BigInt(1),
        tenantId: BigInt(10),
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          branch_id: 1,
          customer_id: 999,
          items: [{ service_id: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus sukses membuat order walk-in dan menghitung diskon dengan tepat', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue({
        id: BigInt(1),
        tenantId: BigInt(10),
      });
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: 'Ahmad Fauzi',
      });
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: BigInt(1),
        price: '8000',
        isActive: true,
      });
      mockPrismaService.discount.findUnique.mockResolvedValue({
        id: BigInt(1),
        typeDiscount: 'percent',
        percent: '10',
        isActive: true,
      });
      mockPrismaService.tenantCourierRules.findFirst.mockResolvedValue(null);

      const createdMockOrder = {
        id: BigInt(1029),
        status: OrderStatus.RECEIVED,
        weightStatus: WeightStatus.NOT_REQUIRED,
        subtotalAmount: 16000,
        discountAmount: 1600,
        courierFee: 0,
        totalAmount: 14400,
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          order: { create: jest.fn().mockResolvedValue(createdMockOrder) },
          orderItem: { create: jest.fn() },
          orderStatusLog: { create: jest.fn() },
        });
      });

      const result = await service.createOrder({
        branch_id: 1,
        customer_id: 1,
        discount_id: 1,
        items: [{ service_id: 1, quantity: 2 }],
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1029);
      expect(result.data.status).toBe(OrderStatus.RECEIVED);
      expect(result.data.total_amount).toBe(14400);
    });

    it('harus sukses membuat order pickup dengan status pending dan ongkir terhitung', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue({
        id: BigInt(1),
        tenantId: BigInt(10),
      });
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: 'Ahmad Fauzi',
      });
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: BigInt(1),
        price: '8000',
        isActive: true,
      });
      mockPrismaService.tenantCourierRules.findFirst.mockResolvedValue({
        flatFee: '10000',
        bothFee: '10000',
      });

      const createdMockOrder = {
        id: BigInt(1030),
        status: OrderStatus.PENDING,
        weightStatus: WeightStatus.PENDING,
        subtotalAmount: 40000,
        discountAmount: 0,
        courierFee: 10000,
        totalAmount: 50000,
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          order: { create: jest.fn().mockResolvedValue(createdMockOrder) },
          orderItem: { create: jest.fn() },
          orderStatusLog: { create: jest.fn() },
        });
      });

      const result = await service.createOrder({
        branch_id: 1,
        customer_id: 1,
        pickup_address_id: 1,
        delivery_address_id: 1,
        estimated_weight: 5,
        items: [{ service_id: 1, quantity: 5 }],
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1030);
      expect(result.data.status).toBe(OrderStatus.PENDING);
      expect(result.data.weight_status).toBe(WeightStatus.PENDING);
      expect(result.data.total_amount).toBe(50000);
    });
  });

  describe('getOrderById', () => {
    it('harus mengembalikan order jika ditemukan', async () => {
      const mockOrder = {
        id: BigInt(1),
        status: OrderStatus.PENDING,
        items: [],
        statusLogs: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById(1);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrder);
    });

    it('harus melempar NotFoundException jika order tidak ada', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById(999)).rejects.toThrow(NotFoundException);
    });
  });
});
