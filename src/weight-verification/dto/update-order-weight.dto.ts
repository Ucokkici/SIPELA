import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateOrderWeightDto {
  @IsNotEmpty({ message: 'actual_weight wajib diisi' })
  @IsNumber({}, { message: 'actual_weight harus berupa angka' })
  @IsPositive({ message: 'actual_weight harus lebih besar dari 0' })
  actual_weight!: number;

  @IsOptional()
  @IsString({ message: 'photo_url harus berupa string' })
  photo_url?: string;
}
