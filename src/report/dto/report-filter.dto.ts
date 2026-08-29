import { IsDateString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportFilterDto {
  @ApiProperty({ description: 'Tanggal mulai laporan (YYYY-MM-DD)', example: '2026-08-01', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: 'Tanggal akhir laporan (YYYY-MM-DD)', example: '2026-08-31', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: 'Filter cabang spesifik', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  branch_id?: number;
}
