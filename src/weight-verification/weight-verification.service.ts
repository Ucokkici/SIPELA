import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WeightStatus,
  ALLOWED_PROCESS_WEIGHT_STATUSES,
  DEFAULT_WEIGHT_TOLERANCE_PERCENT,
} from './weight-verification.constants';
import { UpdateOrderWeightDto } from './dto/update-order-weight.dto';
import { ConfirmOrderWeightDto } from './dto/confirm-order-weight.dto';
import { WeightUnconfirmedException } from './exceptions/weight-unconfirmed.exception';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WeightVerificationService {
  private readonly logger = new Logger(WeightVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Menghitung toleransi selisih berat antara berat aktual dan berat estimasi.
   * @param estimatedWeight Berat estimasi awal dari customer (kg)
   * @param actualWeight Berat aktual hasil timbangan kasir (kg)
   * @param tolerancePercent Persentase batas toleransi (default 10%)
   */
  calculateTolerance(
    estimatedWeight: number | null | undefined,
    actualWeight: number,
    tolerancePercent: number = DEFAULT_WEIGHT_TOLERANCE_PERCENT,
  ): {
    weightStatus: WeightStatus;
    difference: number;
    differencePercent: number;
    allowedTolerance: number;
    isWithinTolerance: boolean;
  } {
    // Jika tidak ada estimasi awal (misalnya walk-in order di outlet)
    if (
      estimatedWeight === null ||
      estimatedWeight === undefined ||
      estimatedWeight <= 0
    ) {
      return {
        weightStatus: WeightStatus.NOT_REQUIRED,
        difference: 0,
        differencePercent: 0,
        allowedTolerance: 0,
        isWithinTolerance: true,
      };
    }

    const diff = Math.abs(actualWeight - estimatedWeight);
    const allowedTol = estimatedWeight * (tolerancePercent / 100);
    const diffPct = (diff / estimatedWeight) * 100;

    // Toleransi komputasi floating point epsilon
    const isWithin = diff <= allowedTol + 0.00001;

    const weightStatus = isWithin
      ? WeightStatus.MATCHED
      : WeightStatus.MISMATCHED;

    return {
      weightStatus,
      difference: Number(diff.toFixed(2)),
      differencePercent: Number(diffPct.toFixed(2)),
      allowedTolerance: Number(allowedTol.toFixed(2)),
      isWithinTolerance: isWithin,
    };
  }

  /**
   * Memvalidasi apakah status berat mengizinkan order untuk lanjut ke tahap 'process'.
   * @param weightStatus Status berat order saat ini
   */
  canProceedToProcess(weightStatus: WeightStatus | string): boolean {
    return ALLOWED_PROCESS_WEIGHT_STATUSES.includes(
      weightStatus as WeightStatus,
    );
  }

  /**
   * Memvalidasi status berat sebelum order pindah ke 'process'.
   * Melempar WeightUnconfirmedException (HTTP 422) jika masih 'mismatched' atau 'pending'.
   * @param weightStatus Status berat saat ini
   */
  validateCanProceedToProcess(weightStatus: WeightStatus | string): void {
    if (!this.canProceedToProcess(weightStatus)) {
      this.logger.warn(
        `Validasi berat gagal: order berstatus berat '${weightStatus}' tidak boleh lanjut ke process sebelum dikonfirmasi.`,
      );
      throw new WeightUnconfirmedException(weightStatus);
    }
  }

  /**
   * Kasir menginput berat aktual: membandingkan toleransi, memperbarui status berat,
   * dan melakukan rekalkulasi total harga jika terjadi perubahan timbangan.
   * Endpoint: PATCH /orders/:id/weight
   */
  async verifyAndApplyWeight(
    id: number | bigint,
    dto: UpdateOrderWeightDto,
  ) {
    const orderId = BigInt(id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tenant: true,
        customer: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order dengan ID ${id} tidak ditemukan`,
        },
      });
    }

    const estimatedWeight = order.estimatedWeight
      ? Number(order.estimatedWeight)
      : null;
    const actualWeight = dto.actual_weight;
    const tolerancePercent = order.tenant?.weightTolerancePercent
      ? Number(order.tenant.weightTolerancePercent)
      : DEFAULT_WEIGHT_TOLERANCE_PERCENT;

    // 1. Hitung selisih toleransi
    const toleranceResult = this.calculateTolerance(
      estimatedWeight,
      actualWeight,
      tolerancePercent,
    );

    // 2. Rekalkulasi subtotal & total amount jika ada items
    let newSubtotal = Number(order.subtotalAmount);

    if (order.items.length > 0) {
      // Hitung ulang harga per item berdasarkan berat aktual
      newSubtotal = order.items.reduce((total, item) => {
        const itemPrice = Number(item.price);
        // Jika item adalah layanan timbangan (default 1 quantity mewakili total berat aktual)
        return total + itemPrice * actualWeight;
      }, 0);
    }

    const discountAmount = Number(order.discountAmount);
    const courierFee = Number(order.courierFee);
    const shippingFee = Number(order.shippingFee);
    const newTotal = Math.max(
      0,
      newSubtotal - discountAmount + courierFee + shippingFee,
    );

    // 3. Simpan perubahan ke database
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Update item quantities jika ada
      for (const item of order.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: new Prisma.Decimal(actualWeight),
            subtotal: new Prisma.Decimal(Number(item.price) * actualWeight),
          },
        });
      }

      // Update Order
      return tx.order.update({
        where: { id: orderId },
        data: {
          actualWeight: new Prisma.Decimal(actualWeight),
          weightStatus: toleranceResult.weightStatus,
          subtotalAmount: new Prisma.Decimal(newSubtotal),
          totalAmount: new Prisma.Decimal(newTotal),
          updatedAt: new Date(),
        },
      });
    });

    const isNotificationSent =
      toleranceResult.weightStatus === WeightStatus.MISMATCHED;

    if (isNotificationSent) {
      this.logger.log(
        `[WeightMismatch] Order #${id} berat mismatched (Est: ${estimatedWeight}kg, Act: ${actualWeight}kg). Triggering WhatsApp notification.`,
      );

      // Trigger job WhatsApp interaktif via BullMQ
      if (this.notificationService) {
        await this.notificationService.queueWeightMismatchNotification({
          order_id: Number(orderId),
          customer_phone: order.customer?.phone || '',
          customer_name: order.customer?.name || '',
          estimated_weight: estimatedWeight || 0,
          actual_weight: actualWeight,
          total_amount: newTotal,
        });
      }
    }

    return {
      success: true,
      data: {
        id: Number(updatedOrder.id),
        actual_weight: Number(updatedOrder.actualWeight),
        estimated_weight: estimatedWeight,
        weight_status: updatedOrder.weightStatus,
        total_amount: Number(updatedOrder.totalAmount),
        notification_sent: isNotificationSent,
      },
    };
  }

  /**
   * Mengonfirmasi selisih berat (dipanggil via webhook WhatsApp / in-app button).
   * Endpoint: POST /orders/:id/weight/confirm
   */
  async confirmWeight(id: number | bigint, dto: ConfirmOrderWeightDto) {
    const orderId = BigInt(id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order dengan ID ${id} tidak ditemukan`,
        },
      });
    }

    if (dto.confirmed) {
      const now = new Date();
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          weightStatus: WeightStatus.CONFIRMED,
          weightConfirmedAt: now,
          updatedAt: now,
        },
      });

      this.logger.log(
        `Order #${id} berat telah dikonfirmasi oleh pelanggan pada ${now.toISOString()}`,
      );

      return {
        success: true,
        data: {
          id: Number(updatedOrder.id),
          weight_status: updatedOrder.weightStatus,
          weight_confirmed_at: updatedOrder.weightConfirmedAt,
        },
      };
    } else {
      // Jika pelanggan menolak berat baru
      this.logger.warn(`Order #${id} pelanggan menolak penyesuaian berat.`);
      return {
        success: true,
        data: {
          id: Number(order.id),
          weight_status: order.weightStatus,
          message: 'Penolakan berat dicatat. Order menunggu penanganan operator.',
        },
      };
    }
  }
}
