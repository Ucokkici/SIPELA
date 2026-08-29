import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Pembayaran (Payment)')
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Membuat transaksi pembayaran order
   * POST /v1/orders/:id/payments
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat pembayaran order (Cash kasir atau Digital QRIS/Transfer)' })
  @ApiResponse({ status: 201, description: 'Pembayaran berhasil dibuat' })
  @Post('orders/:id/payments')
  async createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(id, dto);
  }

  /**
   * Mengambil riwayat pembayaran order
   * GET /v1/orders/:id/payments
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil seluruh riwayat pembayaran untuk order tertentu' })
  @ApiResponse({ status: 200, description: 'Riwayat pembayaran' })
  @Get('orders/:id/payments')
  async getPaymentsByOrderId(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.getPaymentsByOrderId(id);
  }

  /**
   * Webhook callback payment gateway
   * POST /v1/webhooks/payment
   */
  @Public()
  @ApiOperation({ summary: 'Webhook callback dari Payment Gateway (Midtrans / Xendit)' })
  @ApiResponse({ status: 200, description: 'Callback berhasil diproses' })
  @Post('webhooks/payment')
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentService.handleWebhook(dto);
  }
}
