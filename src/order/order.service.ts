import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { PhotoVerificationService } from '../photo-verification/photo-verification.service';
import { WeightVerificationService } from '../weight-verification/weight-verification.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './order.constants';
import { WeightStatus } from '../weight-verification/weight-verification.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachineService: OrderStateMachineService,
    private readonly photoVerificationService: PhotoVerificationService,
    private readonly weightVerificationService: WeightVerificationService,
  ) {}

  /**
   * Membuat order baru (walk-in atau order pickup rumah)
   * Endpoint: POST /orders
   */
  async createOrder(dto: CreateOrderDto, tenantIdContext?: number) {
    const branchId = BigInt(dto.branch_id);
    const customerId = BigInt(dto.customer_id);

    // 1. Validasi Cabang
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });

    if (!branch) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: `Cabang dengan ID ${dto.branch_id} tidak ditemukan`,
        },
      });
    }

    const tenantId = branch.tenantId;

    // 2. Validasi Customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: `Customer dengan ID ${dto.customer_id} tidak ditemukan`,
        },
      });
    }

    // 3. Validasi & Kalkulasi Item Layanan
    let subtotalAmount = 0;
    const validatedItems: Array<{
      serviceId: bigint;
      price: Prisma.Decimal;
      quantity: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      notes?: string;
    }> = [];

    for (const item of dto.items) {
      const service = await this.prisma.service.findUnique({
        where: { id: BigInt(item.service_id) },
      });

      if (!service || !service.isActive) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `Layanan dengan ID ${item.service_id} tidak tersedia atau nonaktif`,
          },
        });
      }

      const qty = item.quantity || (dto.estimated_weight ? dto.estimated_weight : 1);
      const itemPrice = Number(service.price);
      const itemSubtotal = itemPrice * qty;
      subtotalAmount += itemSubtotal;

      validatedItems.push({
        serviceId: service.id,
        price: service.price,
        quantity: new Prisma.Decimal(qty),
        subtotal: new Prisma.Decimal(itemSubtotal),
        notes: item.notes,
      });
    }

    // 4. Kalkulasi Diskon / Membership
    let discountAmount = 0;

    if (dto.discount_id) {
      const discount = await this.prisma.discount.findUnique({
        where: { id: BigInt(dto.discount_id) },
      });

      if (discount && discount.isActive) {
        if (discount.typeDiscount === 'percent' && discount.percent) {
          discountAmount = subtotalAmount * (Number(discount.percent) / 100);
        } else if (discount.price) {
          discountAmount = Number(discount.price);
        }
      }
    } else if (dto.membership_id) {
      const membership = await this.prisma.membership.findUnique({
        where: { id: BigInt(dto.membership_id) },
      });

      if (membership && membership.isActive && membership.percent) {
        discountAmount = subtotalAmount * (Number(membership.percent) / 100);
      }
    }

    // 5. Kalkulasi Ongkos Kirim (Courier Fee)
    let courierFee = 0;
    const courierRules = await this.prisma.tenantCourierRules.findFirst({
      where: {
        tenantId: tenantId,
        branchId: branchId,
      },
    });

    const isPickup = !!dto.pickup_address_id;
    const isDelivery = !!dto.delivery_address_id;

    if (courierRules) {
      if (isPickup && isDelivery) {
        courierFee = Number(courierRules.bothFee || courierRules.flatFee || 0);
      } else if (isPickup) {
        courierFee = Number(courierRules.pickupFee || courierRules.flatFee || 0);
      } else if (isDelivery) {
        courierFee = Number(courierRules.deliveryFee || courierRules.flatFee || 0);
      }
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount + courierFee);

    // 6. Penentuan Status Awal
    const initialStatus = isPickup ? OrderStatus.PENDING : OrderStatus.RECEIVED;
    const initialWeightStatus = isPickup
      ? dto.estimated_weight
        ? WeightStatus.PENDING
        : WeightStatus.NOT_REQUIRED
      : WeightStatus.NOT_REQUIRED;

    // 7. Simpan Order & Items secara Atomik
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId: tenantId,
          branchId: branchId,
          customerId: customerId,
          pickupAddressId: dto.pickup_address_id ? BigInt(dto.pickup_address_id) : null,
          deliveryAddressId: dto.delivery_address_id ? BigInt(dto.delivery_address_id) : null,
          discountId: dto.discount_id ? BigInt(dto.discount_id) : null,
          membershipId: dto.membership_id ? BigInt(dto.membership_id) : null,
          estimatedWeight: dto.estimated_weight ? new Prisma.Decimal(dto.estimated_weight) : null,
          actualWeight: null,
          weightStatus: initialWeightStatus,
          subtotalAmount: new Prisma.Decimal(subtotalAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          courierFee: new Prisma.Decimal(courierFee),
          shippingFee: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentStatus: 'unpaid',
          status: initialStatus,
        },
      });

      // Insert Order Items
      for (const item of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            serviceId: item.serviceId,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            notes: item.notes || null,
          },
        });
      }

      // Insert Initial Status Log
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          status: initialStatus,
          note: isPickup ? 'Pesanan pickup baru dibuat oleh pelanggan' : 'Pesanan walk-in outlet dibuat',
          photoRequired: false,
        },
      });

      return order;
    });

    this.logger.log(`Pesanan baru #${createdOrder.id} berhasil dibuat dengan status '${initialStatus}'`);

    return {
      success: true,
      data: {
        id: Number(createdOrder.id),
        status: createdOrder.status,
        weight_status: createdOrder.weightStatus,
        estimated_weight: dto.estimated_weight || null,
        subtotal_amount: Number(createdOrder.subtotalAmount),
        discount_amount: Number(createdOrder.discountAmount),
        courier_fee: Number(createdOrder.courierFee),
        total_amount: Number(createdOrder.totalAmount),
      },
    };
  }

  /**
   * Mengubah status order dengan validasi state machine dan verifikasi foto wajib.
   * @param id ID Order
   * @param dto DTO status baru, photo_url opsional/wajib, catatan
   */
  async updateStatus(id: number | bigint, dto: UpdateOrderStatusDto) {
    const orderId = BigInt(id);

    // 1. Cari data order yang bersangkutan
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order dengan ID ${id} tidak ditemukan`,
        },
      });
    }

    const currentStatus = existingOrder.status as OrderStatus;
    const targetStatus = dto.status;

    // 2. Validasi State Machine (melempar 422 INVALID_STATUS_TRANSITION jika salah)
    this.stateMachineService.validateTransition(currentStatus, targetStatus);

    // 3. Validasi Foto Wajib (melempar 422 PHOTO_REQUIRED jika foto wajib tapi tidak ada)
    this.photoVerificationService.validatePhotoRequirement(
      targetStatus,
      dto.photo_url,
    );

    // 4. Validasi Status Berat jika transisi ke 'process' (melempar 422 WEIGHT_NOT_CONFIRMED jika mismatched/pending)
    if (targetStatus === OrderStatus.PROCESS) {
      this.weightVerificationService.validateCanProceedToProcess(
        existingOrder.weightStatus,
      );
    }

    const isPhotoReq = this.photoVerificationService.isPhotoRequired(targetStatus);

    // 4. Update order & buat order_status_log dalam satu database transaction
    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
        },
      }),
      this.prisma.orderStatusLog.create({
        data: {
          orderId: orderId,
          status: targetStatus,
          changedBy: dto.changed_by ? BigInt(dto.changed_by) : null,
          note: dto.note || null,
          photoUrl: dto.photo_url || null,
          photoRequired: isPhotoReq,
        },
      }),
    ]);

    this.logger.log(
      `Order #${id} status berhasil diubah: ${currentStatus} -> ${targetStatus}`,
    );

    return {
      success: true,
      data: {
        id: Number(updatedOrder.id),
        status: updatedOrder.status,
      },
    };
  }

  /**
   * Mengambil detail lengkap order berdasarkan ID.
   * @param id ID Order
   */
  async getOrderById(id: number | bigint) {
    const orderId = BigInt(id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            service: true,
          },
        },
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
        customer: true,
        courier: true,
        pickupAddress: true,
        deliveryAddress: true,
        discount: true,
        membership: true,
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

    return {
      success: true,
      data: order,
    };
  }
}
