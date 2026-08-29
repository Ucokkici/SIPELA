import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CourierService } from './courier.service';
import { RecordLocationDto } from './dto/record-location.dto';
import { AssignCourierDto } from './dto/assign-courier.dto';

@ApiTags('Kurir & Live Tracking (Courier)')
@ApiBearerAuth()
@Controller()
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  /**
   * Kurir mengirim ping koordinat lokasi.
   * POST /v1/couriers/:id/location
   */
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
   * GET /v1/orders/:id/courier-location
   */
  @ApiOperation({ summary: 'Mendapatkan lokasi terakhir kurir untuk order (fallback HTTP)' })
  @ApiResponse({ status: 200, description: 'Koordinat lokasi terakhir kurir' })
  @Get('orders/:id/courier-location')
  async getCourierLocation(@Param('id', ParseIntPipe) id: number) {
    return this.courierService.getLatestCourierLocation(id);
  }
}
