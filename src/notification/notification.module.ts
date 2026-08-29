import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { NotificationService } from './notification.service';
import { WhatsAppService } from './services/whatsapp.service';
import { NotificationProcessor } from './processors/notification.processor';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { WeightVerificationModule } from '../weight-verification/weight-verification.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    forwardRef(() => WeightVerificationModule),
  ],
  controllers: [WhatsAppWebhookController],
  providers: [NotificationService, WhatsAppService, NotificationProcessor],
  exports: [NotificationService, WhatsAppService],
})
export class NotificationModule {}
