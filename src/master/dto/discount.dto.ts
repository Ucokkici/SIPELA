import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateDiscountDto {
  @ApiProperty({ description: 'ID Cabang yang menerapkan diskon', example: 1 })
  @IsNotEmpty({ message: 'branch_id wajib diisi' })
  @IsNumber({}, { message: 'branch_id harus berupa angka' })
  branch_id!: number;

  @ApiProperty({ description: 'Nama voucher / promosi', example: 'Promo Gajian 20%' })
  @IsNotEmpty({ message: 'name voucher wajib diisi' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Tipe potongan diskon', enum: ['percent', 'nominal'], example: 'percent' })
  @IsNotEmpty({ message: 'typeDiscount wajib diisi' })
  @IsIn(['percent', 'nominal'], {
    message: 'typeDiscount harus berupa percent atau nominal',
  })
  typeDiscount!: string;

  @ApiProperty({ description: 'Persentase diskon (jika tipe percent)', example: 20.0, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  percent?: number;

  @ApiProperty({ description: 'Nominal potongan rupiah (jika tipe nominal)', example: 15000, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({ description: 'Status keaktifan promo', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
