import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Nomor referensi pembayaran', example: 'REF_1029_1724935200' })
  @IsNotEmpty()
  @IsString()
  reference_no!: string;

  @ApiProperty({ description: 'Status callback pembayaran', enum: ['success', 'failed', 'refunded'], example: 'success' })
  @IsNotEmpty()
  @IsString()
  status!: string;

  @ApiProperty({ description: 'ID Order (opsional jika sudah terkandung di reference)', required: false })
  @IsOptional()
  order_id?: number;

  @ApiProperty({ description: 'Tanda tangan otentikasi webhook (signature)', required: false })
  @IsOptional()
  @IsString()
  signature?: string;
}
