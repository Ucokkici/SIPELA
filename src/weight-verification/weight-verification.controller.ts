import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WeightVerificationService } from './weight-verification.service';
import { UpdateOrderWeightDto } from './dto/update-order-weight.dto';
import { ConfirmOrderWeightDto } from './dto/confirm-order-weight.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Verifikasi Berat (Weight Verification)')
@Controller('orders')
export class WeightVerificationController {
  constructor(
    private readonly weightVerificationService: WeightVerificationService,
  ) {}

  /**
   * Kasir menginput berat aktual timbangan di outlet.
   * PATCH /v1/orders/:id/weight
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kasir menginput berat timbangan aktual (otomatis cek toleransi)' })
  @ApiResponse({ status: 200, description: 'Berat berhasil dicatat dan diverifikasi' })
  @Patch(':id/weight')
  async updateWeight(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderWeightDto,
  ) {
    return this.weightVerificationService.verifyAndApplyWeight(id, dto);
  }

  /**
   * Konfirmasi berat oleh pelanggan (via tombol interaktif WA / aplikasi).
   * POST /v1/orders/:id/weight/confirm
   */
  @Public()
  @ApiOperation({ summary: 'Konfirmasi persetujuan penyesuaian berat oleh pelanggan' })
  @ApiResponse({ status: 200, description: 'Berat berhasil dikonfirmasi' })
  @Post(':id/weight/confirm')
  async confirmWeight(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmOrderWeightDto,
  ) {
    return this.weightVerificationService.confirmWeight(id, dto);
  }
}
