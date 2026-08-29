import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membuat transaksi pembayaran baru (Cash kasir atau Digital QRIS/Transfer)
   * Endpoint: POST /orders/:id/payments
   */
  async createPayment(id: number | bigint, dto: CreatePaymentDto) {
    const orderId = BigInt(id);

    // 1. Cari data order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
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

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ORDER_ALREADY_PAID',
          message: `Order #${id} sudah lunas dan tidak memerlukan pembayaran lagi`,
        },
      });
    }

    const isCash = dto.method === 'cash';
    const now = new Date();
    const referenceNo =
      dto.reference_no ||
      `${dto.method.toUpperCase()}_${Date.now()}_${orderId}`;

    const paymentStatus = isCash ? 'success' : 'pending';
    const paidAt = isCash ? now : null;

    // 2. Eksekusi penyimpanan pembayaran & update status order secara atomik
    const [createdPayment, updatedOrder] = await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: orderId,
            method: dto.method,
            amount: new Prisma.Decimal(dto.amount),
            status: paymentStatus,
            referenceNo: referenceNo,
            paidAt: paidAt,
          },
        });

        let currentOrder = order;

        // Jika pembayaran tunai sukses langsung, periksa apakah sudah lunas
        if (isCash) {
          const totalPaidExisting = order.payments
            .filter((p) => p.status === 'success')
            .reduce((sum, p) => sum + Number(p.amount), 0);

          const totalPaidNow = totalPaidExisting + dto.amount;
          const orderTotal = Number(order.totalAmount);

          const newPaymentStatus =
            totalPaidNow >= orderTotal ? 'paid' : 'partial';

          currentOrder = await tx.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: newPaymentStatus,
              updatedAt: now,
            },
            include: { payments: true },
          });
        }

        return [payment, currentOrder];
      },
    );

    this.logger.log(
      `Pembayaran #${createdPayment.id} (${dto.method}) sebesar Rp ${dto.amount} dibuat untuk Order #${id} (Status: ${paymentStatus})`,
    );

    return {
      success: true,
      data: {
        id: Number(createdPayment.id),
        order_id: Number(createdPayment.orderId),
        method: createdPayment.method,
        amount: Number(createdPayment.amount),
        status: createdPayment.status,
        reference_no: createdPayment.referenceNo,
        paid_at: createdPayment.paidAt,
        order_payment_status: updatedOrder.paymentStatus,
        payment_url: !isCash
          ? `https://checkout.sipela.id/pay/${referenceNo}`
          : undefined,
        qr_code_url:
          dto.method === 'qris'
            ? `https://checkout.sipela.id/qr/${referenceNo}`
            : undefined,
      },
    };
  }

  /**
   * Menangani webhook callback dari Payment Gateway (Midtrans / Xendit)
   * Endpoint: POST /webhooks/payment
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    this.logger.log(
      `📩 Webhook payment callback: Ref #${dto.reference_no}, Status: ${dto.status}`,
    );

    const payment = await this.prisma.payment.findUnique({
      where: { referenceNo: dto.reference_no },
      include: { order: { include: { payments: true } } },
    });

    if (!payment) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: `Transaksi pembayaran dengan referensi ${dto.reference_no} tidak ditemukan`,
        },
      });
    }

    if (dto.status === 'success') {
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'success',
            paidAt: now,
          },
        });

        // Hitung total bayar sukses
        const totalPaid = payment.order.payments
          .filter(
            (p) =>
              p.status === 'success' || Number(p.id) === Number(payment.id),
          )
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const orderTotal = Number(payment.order.totalAmount);
        const newPaymentStatus = totalPaid >= orderTotal ? 'paid' : 'partial';

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: newPaymentStatus,
            updatedAt: now,
          },
        });
      });

      this.logger.log(
        `✅ Pembayaran Ref #${dto.reference_no} sukses. Status Order #${payment.orderId} diperbarui menjadi LUNAS/PARTIAL.`,
      );

      return {
        success: true,
        message: 'Pembayaran berhasil dikonfirmasi lunas',
      };
    } else if (dto.status === 'failed' || dto.status === 'refunded') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: dto.status,
        },
      });

      return {
        success: true,
        message: `Status pembayaran diperbarui menjadi ${dto.status}`,
      };
    }

    return {
      success: true,
      message: 'Callback webhook diterima',
    };
  }

  /**
   * Mengambil riwayat pembayaran order
   * Endpoint: GET /orders/:id/payments
   */
  async getPaymentsByOrderId(id: number | bigint) {
    const orderId = BigInt(id);

    const payments = await this.prisma.payment.findMany({
      where: { orderId: orderId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: Number(p.id),
        order_id: Number(p.orderId),
        method: p.method,
        amount: Number(p.amount),
        status: p.status,
        reference_no: p.referenceNo,
        paid_at: p.paidAt,
        created_at: p.createdAt,
      })),
    };
  }
}
