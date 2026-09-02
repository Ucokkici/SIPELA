import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './services/whatsapp.service';
import {
  NOTIFICATION_QUEUE,
  JOB_SEND_WEIGHT_MISMATCH_WA,
  WeightMismatchJobPayload,
} from './notification.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsAppService,
    @Optional()
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue?: Queue,
  ) {}

  /**
   * Mengirim notifikasi selisih berat (Weight Mismatch):
   * 1. Mode Queue: Memakai antrian BullMQ jika Redis aktif.
   * 2. Mode Direct Fallback: Mengirimkan langsung via WhatsAppService jika Redis tidak tersedia/nonaktif.
   * @param payload Data order dan selisih berat
   */
  async queueWeightMismatchNotification(payload: WeightMismatchJobPayload) {
    const isRedisEnabled =
      this.configService.get<string>('REDIS_ENABLED') !== 'false';

    if (isRedisEnabled && this.notificationQueue) {
      try {
        const job = await this.notificationQueue.add(
          JOB_SEND_WEIGHT_MISMATCH_WA,
          payload,
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
          },
        );

        this.logger.log(
          `📥 [Queue Mode] Job Notifikasi Mismatch WhatsApp dimasukkan ke antrian BullMQ [Job ID #${job.id}] untuk Order #${payload.order_id}`,
        );

        return {
          success: true,
          job_id: job.id,
          mode: 'queue',
        };
      } catch (err: any) {
        this.logger.warn(
          `⚠️ Gagal enqueue ke Redis (${err.message}). Mengalihkan ke Direct Fallback Mode...`,
        );
      }
    }

    // Direct Synchronous Fallback (Non-Redis)
    this.logger.log(
      `⚡ [Direct Fallback Mode] Mengirim notifikasi WhatsApp langsung tanpa Redis untuk Order #${payload.order_id}`,
    );

    const result =
      await this.whatsappService.sendWeightMismatchInteractiveMessage(payload);

    return {
      success: true,
      data: result,
      mode: 'direct',
    };
  }
}
