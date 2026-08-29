import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WeightVerificationService } from '../../weight-verification/weight-verification.service';
import {
  WEIGHT_ACTION_CONFIRM_PREFIX,
  WEIGHT_ACTION_REJECT_PREFIX,
} from '../notification.constants';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Notifikasi WhatsApp & Webhook (Notification)')
@Public()
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly weightVerificationService: WeightVerificationService,
  ) {}

  /**
   * Endpoint verifikasi Meta Webhook (GET /v1/webhooks/whatsapp)
   */
  @ApiOperation({ summary: 'Verifikasi URL Webhook Meta Cloud API' })
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Meta Webhook verification request diterima.');
    return challenge || 'OK';
  }

  /**
   * Endpoint penerima callback tombol WhatsApp dari pelanggan.
   * POST /v1/webhooks/whatsapp
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log(
      `📩 Menerima event WhatsApp Webhook: ${JSON.stringify(body)}`,
    );

    let buttonId: string | undefined;

    // 1. Ekstrak button_id dari format Meta Cloud API standar
    try {
      const messages =
        body?.entry?.[0]?.changes?.[0]?.value?.messages || body?.messages;
      if (messages && messages.length > 0) {
        const msg = messages[0];
        if (msg.type === 'interactive' && msg.interactive?.button_reply) {
          buttonId = msg.interactive.button_reply.id;
        }
      }
    } catch {
      // Abaikan parsing error
    }

    // 2. Dukung juga format payload langsung (simplified payload dari custom BSP/testing)
    if (!buttonId && body?.button_id) {
      buttonId = body.button_id;
    }

    // 3. Proses aksi berdasarkan button_id
    if (buttonId) {
      if (buttonId.startsWith(WEIGHT_ACTION_CONFIRM_PREFIX)) {
        const orderIdStr = buttonId.replace(WEIGHT_ACTION_CONFIRM_PREFIX, '');
        const orderId = Number(orderIdStr);

        this.logger.log(
          `Pelanggan menyetujui berat untuk Order #${orderId} via tombol WhatsApp.`,
        );

        await this.weightVerificationService.confirmWeight(orderId, {
          confirmed: true,
        });

        return {
          success: true,
          action: 'confirmed',
          order_id: orderId,
        };
      } else if (buttonId.startsWith(WEIGHT_ACTION_REJECT_PREFIX)) {
        const orderIdStr = buttonId.replace(WEIGHT_ACTION_REJECT_PREFIX, '');
        const orderId = Number(orderIdStr);

        this.logger.warn(
          `Pelanggan menolak penyesuaian berat untuk Order #${orderId} via tombol WhatsApp.`,
        );

        await this.weightVerificationService.confirmWeight(orderId, {
          confirmed: false,
        });

        return {
          success: true,
          action: 'rejected',
          order_id: orderId,
        };
      }
    }

    return {
      success: true,
      message: 'Event webhook diterima',
    };
  }
}
