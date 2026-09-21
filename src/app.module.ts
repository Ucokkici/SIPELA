import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrderModule } from './order/order.module';
import { PhotoVerificationModule } from './photo-verification/photo-verification.module';
import { WeightVerificationModule } from './weight-verification/weight-verification.module';
import { CourierModule } from './courier/courier.module';
import { NotificationModule } from './notification/notification.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { MasterModule } from './master/master.module';
import { ReportModule } from './report/report.module';
import { CustomerModule } from './customer/customer.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Muat .env file dan jadikan ConfigService tersedia secara global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // BullMQ Redis Connection (Graceful & Optional)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (config.get<string>('REDIS_ENABLED') === 'false' || times > 3) {
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        },
      }),
    }),

    // PrismaModule global — bisa diinject di semua module tanpa import ulang
    PrismaModule,

    // Order Module (State Machine)
    OrderModule,

    // Photo Verification Module
    PhotoVerificationModule,

    // Weight Verification Module
    WeightVerificationModule,

    // Courier & Live Tracking Module
    CourierModule,

    // Notification Module (BullMQ & WhatsApp)
    NotificationModule,

    // Authentication & Authorization Module
    AuthModule,

    // Payment Module
    PaymentModule,

    // Master Data CRUD Module
    MasterModule,

    // Report & Analytics Module
    ReportModule,

    // Customer Module
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
