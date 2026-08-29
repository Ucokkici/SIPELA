import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class RecordLocationDto {
  @IsOptional()
  @IsNumber({}, { message: 'order_id harus berupa angka' })
  order_id?: number;

  @IsNotEmpty({ message: 'long (longitude) wajib diisi' })
  @IsNumber({}, { message: 'long harus berupa angka koordinat' })
  long!: number;

  @IsNotEmpty({ message: 'lat (latitude) wajib diisi' })
  @IsNumber({}, { message: 'lat harus berupa angka koordinat' })
  lat!: number;
}
