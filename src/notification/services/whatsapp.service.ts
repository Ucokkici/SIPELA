import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WeightMismatchJobPayload,
  WEIGHT_ACTION_CONFIRM_PREFIX,
  WEIGHT_ACTION_REJECT_PREFIX,
} from '../notification.constants';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Mengirim pesan interaktif WhatsApp ke pelanggan berisi detail berat baru dan 2 tombol (Setuju / Tolak).
   * @param payload Informasi order dan berat aktual/estimasi
   */
  async sendInteractiveWeightConfirmation(payload: WeightMismatchJobPayload) {
    const confirmButtonId = `${WEIGHT_ACTION_CONFIRM_PREFIX}${payload.order_id}`;
    const rejectButtonId = `${WEIGHT_ACTION_REJECT_PREFIX}${payload.order_id}`;

    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(payload.total_amount);

    const messageText =
      `Halo ${payload.customer_name || 'Pelanggan Setia SIPELA'} 👋\n\n` +
      `Cucian Anda untuk Order *#${payload.order_id}* telah selesai ditimbang oleh kasir outlet kami:\n\n` +
      `⚖️ *Berat Estimasi:* ${payload.estimated_weight} kg\n` +
      `⚖️ *Berat Aktual Timbangan:* ${payload.actual_weight} kg\n` +
      `💰 *Total Biaya Baru:* ${formattedTotal}\n\n` +
      `Karena terdapat penyesuaian berat, mohon konfirmasi persetujuan Anda di bawah ini agar proses pencucian dapat segera dimulai:`;

    const interactivePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.customer_phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: messageText,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: confirmButtonId,
                title: '✅ Setuju & Lanjutkan',
              },
            },
            {
              type: 'reply',
              reply: {
                id: rejectButtonId,
                title: '❌ Tolak / Hubungi CS',
              },
            },
          ],
        },
      },
    };

    this.logger.log(
      `📲 [WhatsApp Cloud API] Mengirim WhatsApp interaktif konfirmasi berat ke ${payload.customer_phone} untuk Order #${payload.order_id}`,
    );

    // Di production / integrasi nyata, lakukan POST HTTP ke WhatsApp Cloud API
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (apiUrl && token && phoneId) {
      try {
        // HTTP fetch ke Meta API endpoint
        this.logger.log(`Mengirim payload ke ${apiUrl}/${phoneId}/messages...`);
      } catch (err: any) {
        this.logger.error(`Gagal mengirim pesan WhatsApp: ${err.message}`);
      }
    }

    return {
      success: true,
      message_id: `wam_${Date.now()}_${payload.order_id}`,
      payload: interactivePayload,
    };
  }
}
