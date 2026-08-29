import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  JOB_SEND_WEIGHT_MISMATCH_WA,
  WeightMismatchJobPayload,
} from './notification.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Menambahkan job notifikasi selisih berat ke antrian BullMQ.
   * @param payload Data order dan selisih berat
   */
  async queueWeightMismatchNotification(payload: WeightMismatchJobPayload) {
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
      `📥 Job Notifikasi Mismatch WhatsApp dimasukkan ke antrian BullMQ [Job ID #${job.id}] untuk Order #${payload.order_id}`,
    );

    return {
      success: true,
      job_id: job.id,
    };
  }
}
