import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Pesanan (Orders)')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Mengambil daftar pesanan (dengan filter status, branch, customer, search, pagination)
   * GET /v1/orders - Khusus Kasir / Pegawai Terautentikasi
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mengambil daftar pesanan dengan filter & pagination (Kasir/Staff)' })
  @ApiResponse({ status: 200, description: 'Daftar pesanan berhasil diambil' })
  @Get()
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryOrderDto,
  ) {
    return this.orderService.getOrders(user, query);
  }

  /**
   * Membuat order baru (walk-in atau pickup)
   * POST /v1/orders - Terbuka untuk Guest / Pelanggan Landing Page & Kasir POS
   */
  @Public()
  @ApiOperation({ summary: 'Membuat order baru (Guest Landing Page / Kasir POS)' })
  @ApiResponse({ status: 201, description: 'Order baru berhasil dibuat' })
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  /**
   * Mengubah status order (dengan validasi foto wajib & state machine)
   * PATCH /v1/orders/:id/status - Khusus Kasir / Kurir Terautentikasi
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
   * Mengambil detail order (Struk / Live Tracking Status)
   * GET /v1/orders/:id - Terbuka untuk Pelanggan / Guest via Order ID
   */
  @Public()
  @ApiOperation({ summary: 'Mengambil detail lengkap pesanan / struk tracking berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail lengkap order' })
  @ApiResponse({ status: 404, description: 'Order tidak ditemukan' })
  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id);
  }
}
