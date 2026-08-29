import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.constants';

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'Status wajib diisi' })
  @IsEnum(OrderStatus, {
    message:
      'Status tidak valid. Pilihan: pending, pickup, received, process, delivery, done, cancelled',
  })
  status!: OrderStatus;

  @IsOptional()
  @IsString({ message: 'photo_url harus berupa string' })
  photo_url?: string;

  @IsOptional()
  @IsString({ message: 'note harus berupa string' })
  note?: string;

  @IsOptional()
  changed_by?: number;
}
