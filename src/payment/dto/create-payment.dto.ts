import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Metode pembayaran',
    enum: ['cash', 'transfer', 'qris', 'ewallet'],
    example: 'qris',
  })
  @IsNotEmpty({ message: 'method pembayaran wajib diisi' })
  @IsIn(['cash', 'transfer', 'qris', 'ewallet'], {
    message: 'Metode pembayaran harus salah satu dari: cash, transfer, qris, ewallet',
  })
  method!: string;

  @ApiProperty({
    description: 'Jumlah nominal yang dibayarkan',
    example: 45000,
  })
  @IsNotEmpty({ message: 'amount wajib diisi' })
  @IsNumber({}, { message: 'amount harus berupa angka' })
  @IsPositive({ message: 'amount harus lebih besar dari 0' })
  amount!: number;

  @ApiProperty({
    description: 'Nomor referensi eksternal (opsional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference_no?: string;
}
