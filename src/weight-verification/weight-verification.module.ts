import { Module, forwardRef } from '@nestjs/common';
import { WeightVerificationService } from './weight-verification.service';
import { WeightVerificationController } from './weight-verification.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [WeightVerificationController],
  providers: [WeightVerificationService],
  exports: [WeightVerificationService],
})
export class WeightVerificationModule {}
