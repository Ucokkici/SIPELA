import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Log query lambat di development untuk debugging
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  // Koneksi ke database saat module diinisialisasi
  async onModuleInit() {
    await this.$connect();
  }

  // Putuskan koneksi saat aplikasi berhenti (graceful shutdown)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
