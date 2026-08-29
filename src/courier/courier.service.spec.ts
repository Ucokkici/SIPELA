import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CourierService } from './courier.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourierGateway } from './courier.gateway';
import { Prisma } from '@prisma/client';

describe('CourierService', () => {
  let service: CourierService;
  let prisma: PrismaService;
  let gateway: CourierGateway;

  const mockPrismaService = {
    courier: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courierLocationLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockCourierGateway = {
    broadcastCourierLocation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CourierGateway, useValue: mockCourierGateway },
      ],
    }).compile();

    service = module.get<CourierService>(CourierService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<CourierGateway>(CourierGateway);

    jest.clearAllMocks();
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Ping Lokasi Kurir (recordLocation)', () => {
    it('harus melempar NotFoundException jika kurir tidak ditemukan', async () => {
      mockPrismaService.courier.findUnique.mockResolvedValue(null);

      await expect(
        service.recordLocation(999, {
          long: 106.827153,
          lat: -6.175392,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus sukses mencatat log lokasi tanpa broadcast jika order_id tidak disertakan', async () => {
      mockPrismaService.courier.findUnique.mockResolvedValue({
        id: BigInt(8),
        name: 'Kurir Budi',
      });
      mockPrismaService.courierLocationLog.create.mockResolvedValue({
        id: BigInt(1),
        courierId: BigInt(8),
        orderId: null,
        long: new Prisma.Decimal(106.827153),
        lat: new Prisma.Decimal(-6.175392),
      });

      const result = await service.recordLocation(8, {
        long: 106.827153,
        lat: -6.175392,
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.courierLocationLog.create).toHaveBeenCalledTimes(1);
      expect(mockCourierGateway.broadcastCourierLocation).not.toHaveBeenCalled();
    });

    it('harus sukses mencatat log dan mem-broadcast update WS jika order_id disertakan', async () => {
      mockPrismaService.courier.findUnique.mockResolvedValue({
        id: BigInt(8),
        name: 'Kurir Budi',
      });
      mockPrismaService.courierLocationLog.create.mockResolvedValue({
        id: BigInt(1),
        courierId: BigInt(8),
        orderId: BigInt(1029),
        long: new Prisma.Decimal(106.827153),
        lat: new Prisma.Decimal(-6.175392),
      });

      const result = await service.recordLocation(8, {
        order_id: 1029,
        long: 106.827153,
        lat: -6.175392,
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.courierLocationLog.create).toHaveBeenCalledTimes(1);
      expect(mockCourierGateway.broadcastCourierLocation).toHaveBeenCalledWith(
        1029,
        {
          order_id: 1029,
          courier_id: 8,
          long: 106.827153,
          lat: -6.175392,
        },
      );
    });
  });

  describe('2. Penugasan Kurir (assignCourier)', () => {
    it('harus melempar NotFoundException jika order tidak ditemukan', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCourier(999, { courier_id: 8 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melempar NotFoundException jika kurir tidak ditemukan', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: BigInt(1029),
      });
      mockPrismaService.courier.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCourier(1029, { courier_id: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus sukses menugaskan kurir ke order dan mengembalikan response terformat', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: BigInt(1029),
      });
      mockPrismaService.courier.findUnique.mockResolvedValue({
        id: BigInt(8),
        name: 'Kurir Budi',
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: BigInt(1029),
        courierId: BigInt(8),
      });

      const result = await service.assignCourier(1029, { courier_id: 8 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 1029,
        courier_id: 8,
      });
    });
  });

  describe('3. Fallback Lokasi Terakhir Kurir (getLatestCourierLocation)', () => {
    it('harus melempar NotFoundException jika tidak ada log lokasi untuk order', async () => {
      mockPrismaService.courierLocationLog.findFirst.mockResolvedValue(null);

      await expect(service.getLatestCourierLocation(1029)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('harus mengembalikan lokasi terakhir jika log ditemukan', async () => {
      const now = new Date('2026-08-29T10:20:00.000Z');
      mockPrismaService.courierLocationLog.findFirst.mockResolvedValue({
        id: BigInt(1),
        courierId: BigInt(8),
        orderId: BigInt(1029),
        long: new Prisma.Decimal(106.827153),
        lat: new Prisma.Decimal(-6.175392),
        createdAt: now,
      });

      const result = await service.getLatestCourierLocation(1029);

      expect(result.success).toBe(true);
      expect(result.data.long).toBe(106.827153);
      expect(result.data.lat).toBe(-6.175392);
      expect(result.data.updated_at).toBe(now.toISOString());
    });
  });
});
