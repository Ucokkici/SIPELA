import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Pesanan (Orders)')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Membuat order baru (walk-in atau pickup)
   * POST /v1/orders
   */
  @ApiOperation({ summary: 'Membuat order baru (Walk-in atau Pickup)' })
  @ApiResponse({ status: 201, description: 'Order baru berhasil dibuat' })
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  /**
   * Mengubah status order (dengan validasi foto wajib & state machine)
   * PATCH /v1/orders/:id/status
   */
  @ApiOperation({ summary: 'Memperbarui status order (dengan verifikasi foto wajib & state machine)' })
  @ApiResponse({ status: 200, description: 'Status order berhasil diperbarui' })
  @ApiResponse({ status: 422, description: 'Transisi tidak valid atau foto wajib belum diunggah' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
  }

  /**
   * Mengambil detail order
   * GET /v1/orders/:id
   */
  @ApiOperation({ summary: 'Mengambil detail lengkap pesanan berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail lengkap order' })
  @ApiResponse({ status: 404, description: 'Order tidak ditemukan' })
  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id);
  }
}
