import { Module } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PhotoVerificationModule } from '../photo-verification/photo-verification.module';
import { WeightVerificationModule } from '../weight-verification/weight-verification.module';

@Module({
  imports: [PhotoVerificationModule, WeightVerificationModule],
  controllers: [OrderController],
  providers: [OrderStateMachineService, OrderService],
  exports: [OrderStateMachineService, OrderService],
})
export class OrderModule {}
