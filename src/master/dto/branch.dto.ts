import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ description: 'Nama Cabang', example: 'SIPELA Express — Cabang Kemang' })
  @IsNotEmpty({ message: 'name cabang wajib diisi' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Alamat lengkap lokasi cabang', example: 'Jl. Kemang Raya No. 88, Jakarta Selatan' })
  @IsNotEmpty({ message: 'location cabang wajib diisi' })
  @IsString()
  location!: string;

  @ApiProperty({ description: 'Email operasional cabang', example: 'kemang@sipela.id', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Nomor telepon cabang', example: '0217180123', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Koordinat Bujur (Longitude)', example: 106.815, required: false })
  @IsOptional()
  @IsNumber()
  long?: number;

  @ApiProperty({ description: 'Koordinat Lintang (Latitude)', example: -6.262, required: false })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiProperty({ description: 'Apakah cabang utama?', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_main_branch?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
