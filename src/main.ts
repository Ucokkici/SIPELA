import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BigIntTransformInterceptor } from './common/interceptors/bigint-transform.interceptor';
import { TenantGuard } from './common/guards/tenant.guard';

// Support BigInt JSON serialization otomatis
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix global untuk semua endpoint: /v1
  app.setGlobalPrefix('v1');

  // Validasi DTO global menggunakan class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Hapus property yang tidak ada di DTO
      forbidNonWhitelisted: true, // Tolak request dengan property asing
      transform: true, // Auto-transform payload ke instance DTO
      transformOptions: {
        enableImplicitConversion: true, // Konversi tipe otomatis (string → number, dll)
      },
    }),
  );

  // Global Interceptor untuk serialisasi BigInt & Decimal
  app.useGlobalInterceptors(new BigIntTransformInterceptor());

  // Global Guard untuk proteksi multi-tenancy (IDOR Protection)
  app.useGlobalGuards(new TenantGuard());

  // CORS — izinkan frontend dev (Next.js default port 3000)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Konfigurasi Swagger OpenAPI Documentation di /v1/docs
  const config = new DocumentBuilder()
    .setTitle('SIPELA Backend API')
    .setDescription(
      'Dokumentasi API REST & WebSocket untuk Platform SaaS Manajemen Laundry SIPELA v2.0.0',
    )
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 SIPELA API berjalan di http://localhost:${port}/v1`);
  console.log(`📚 Swagger UI Interaktif: http://localhost:${port}/v1/docs`);
}
bootstrap();
