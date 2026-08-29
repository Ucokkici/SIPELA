import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  NOTIFICATION_QUEUE,
  JOB_SEND_WEIGHT_MISMATCH_WA,
  WeightMismatchJobPayload,
} from '../notification.constants';
import { WhatsAppService } from '../services/whatsapp.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `⚙️ Memproses Job BullMQ [${job.name}] dengan Job ID #${job.id}`,
    );

    switch (job.name) {
      case JOB_SEND_WEIGHT_MISMATCH_WA:
        return this.handleWeightMismatch(job.data as WeightMismatchJobPayload);
      default:
        this.logger.warn(`Job ${job.name} tidak dikenali`);
        return null;
    }
  }

  private async handleWeightMismatch(data: WeightMismatchJobPayload) {
    return this.whatsAppService.sendInteractiveWeightConfirmation(data);
  }
}
