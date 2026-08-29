import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ description: 'ID Cabang yang menyediakan layanan', example: 1 })
  @IsNotEmpty({ message: 'branch_id wajib diisi' })
  @IsNumber({}, { message: 'branch_id harus berupa angka' })
  branch_id!: number;

  @ApiProperty({ description: 'Nama paket layanan', example: 'Cuci Komplit Kilat 1 Hari' })
  @IsNotEmpty({ message: 'name layanan wajib diisi' })
  @IsString({ message: 'name harus berupa string' })
  name!: string;

  @ApiProperty({ description: 'Harga per satuan / kg', example: 12000 })
  @IsNotEmpty({ message: 'price wajib diisi' })
  @IsNumber({}, { message: 'price harus berupa angka' })
  @IsPositive({ message: 'price harus lebih besar dari 0' })
  price!: number;

  @ApiProperty({ description: 'Status keaktifan layanan', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
