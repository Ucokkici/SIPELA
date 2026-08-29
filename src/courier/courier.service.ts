import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourierGateway } from './courier.gateway';
import { RecordLocationDto } from './dto/record-location.dto';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CourierService {
  private readonly logger = new Logger(CourierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly courierGateway: CourierGateway,
  ) {}

  /**
   * Menyimpan ping lokasi kurir dan mem-broadcast update via WebSocket jika terikat ke order.
   * Endpoint: POST /couriers/:id/location
   * @param courierId ID Kurir
   * @param dto Koordinat (long, lat) dan order_id opsional
   */
  async recordLocation(courierId: number | bigint, dto: RecordLocationDto) {
    const cid = BigInt(courierId);

    // 1. Validasi keberadaan kurir
    const courier = await this.prisma.courier.findUnique({
      where: { id: cid },
    });

    if (!courier) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COURIER_NOT_FOUND',
          message: `Kurir dengan ID ${courierId} tidak ditemukan`,
        },
      });
    }

    // 2. Simpan ping ke courier_location_log
    const orderId = dto.order_id ? BigInt(dto.order_id) : null;
    await this.prisma.courierLocationLog.create({
      data: {
        courierId: cid,
        orderId: orderId,
        long: new Prisma.Decimal(dto.long),
        lat: new Prisma.Decimal(dto.lat),
      },
    });

    // 3. Jika ada order_id, kirim realtime event lewat WebSocket Gateway
    if (dto.order_id) {
      this.courierGateway.broadcastCourierLocation(dto.order_id, {
        order_id: dto.order_id,
        courier_id: Number(courierId),
        long: dto.long,
        lat: dto.lat,
      });
    }

    return {
      success: true,
    };
  }

  /**
   * Operator menugaskan kurir ke order tertentu.
   * Endpoint: PATCH /orders/:id/assign-courier
   * @param orderId ID Order
   * @param dto ID Kurir yang ditugaskan
   */
  async assignCourier(orderId: number | bigint, dto: AssignCourierDto) {
    const oid = BigInt(orderId);
    const cid = BigInt(dto.courier_id);

    // 1. Validasi order
    const order = await this.prisma.order.findUnique({
      where: { id: oid },
    });

    if (!order) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order dengan ID ${orderId} tidak ditemukan`,
        },
      });
    }

    // 2. Validasi kurir
    const courier = await this.prisma.courier.findUnique({
      where: { id: cid },
    });

    if (!courier) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COURIER_NOT_FOUND',
          message: `Kurir dengan ID ${dto.courier_id} tidak ditemukan`,
        },
      });
    }

    // 3. Update relasi kurir di order
    const updatedOrder = await this.prisma.order.update({
      where: { id: oid },
      data: {
        courierId: cid,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Kurir #${dto.courier_id} (${courier.name}) berhasil ditugaskan ke Order #${orderId}`,
    );

    return {
      success: true,
      data: {
        id: Number(updatedOrder.id),
        courier_id: Number(updatedOrder.courierId),
      },
    };
  }

  /**
   * Mengambil lokasi terbaru kurir untuk order tertentu (fallback jika klien tidak menggunakan WebSocket).
   * Endpoint: GET /orders/:id/courier-location
   * @param orderId ID Order
   */
  async getLatestCourierLocation(orderId: number | bigint) {
    const oid = BigInt(orderId);

    const latestLog = await this.prisma.courierLocationLog.findFirst({
      where: { orderId: oid },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestLog) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LOCATION_LOG_NOT_FOUND',
          message: `Belum ada log lokasi untuk order dengan ID ${orderId}`,
        },
      });
    }

    return {
      success: true,
      data: {
        long: Number(latestLog.long),
        lat: Number(latestLog.lat),
        updated_at: latestLog.createdAt.toISOString(),
      },
    };
  }
}
