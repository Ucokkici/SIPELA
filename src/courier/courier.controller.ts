import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CourierService } from './courier.service';
import { RecordLocationDto } from './dto/record-location.dto';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Kurir & Live Tracking (Courier)')
@Controller()
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  /**
   * Mengambil daftar kurir untuk dropdown penugasan operator/kasir.
   * GET /v1/couriers
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mengambil seluruh daftar kurir aktif untuk penugasan order' })
  @ApiQuery({ name: 'branch_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Daftar kurir aktif berhasil diambil' })
  @Get('couriers')
  async getCouriers(
    @CurrentUser() user: JwtPayload,
    @Query('branch_id') branchId?: number,
  ) {
    return this.courierService.getCouriers(user.tenant_id, branchId);
  }

  /**
   * Kurir mengirim ping koordinat lokasi.
   * POST /v1/couriers/:id/location
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kurir mengirim koordinat lokasi (broadcast realtime via WebSocket)' })
  @ApiResponse({ status: 200, description: 'Ping lokasi kurir berhasil dicatat' })
  @Post('couriers/:id/location')
  async recordLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordLocationDto,
  ) {
    return this.courierService.recordLocation(id, dto);
  }

  /**
   * Operator menugaskan kurir ke order.
   * PATCH /v1/orders/:id/assign-courier
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Operator menugaskan kurir ke order tertentu' })
  @ApiResponse({ status: 200, description: 'Kurir berhasil ditugaskan' })
  @Patch('orders/:id/assign-courier')
  async assignCourier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCourierDto,
  ) {
    return this.courierService.assignCourier(id, dto);
  }

  /**
   * Mengambil lokasi kurir terakhir untuk order tertentu (fallback HTTP).
   * GET /v1/orders/:id/courier-location - Terbuka untuk Pelanggan / Guest via Order ID
   */
  @Public()
  @ApiOperation({ summary: 'Mendapatkan lokasi terakhir kurir untuk order (fallback HTTP / Publik)' })
  @ApiResponse({ status: 200, description: 'Koordinat lokasi terakhir kurir' })
  @Get('orders/:id/courier-location')
  async getCourierLocation(@Param('id', ParseIntPipe) id: number) {
    return this.courierService.getLatestCourierLocation(id);
  }
}
