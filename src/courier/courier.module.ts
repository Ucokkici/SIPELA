import { Module } from '@nestjs/common';
import { CourierService } from './courier.service';
import { CourierController } from './courier.controller';
import { CourierGateway } from './courier.gateway';

@Module({
  controllers: [CourierController],
  providers: [CourierService, CourierGateway],
  exports: [CourierService, CourierGateway],
})
export class CourierModule {}
