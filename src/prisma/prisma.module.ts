import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global module — PrismaService tersedia di semua module tanpa perlu import PrismaModule
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
