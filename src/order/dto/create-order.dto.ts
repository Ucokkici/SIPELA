import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsNotEmpty({ message: 'service_id wajib diisi' })
  @IsNumber({}, { message: 'service_id harus berupa angka' })
  service_id!: number;

  @IsOptional()
  @IsNumber({}, { message: 'quantity harus berupa angka' })
  @IsPositive({ message: 'quantity harus lebih besar dari 0' })
  quantity?: number;

  @IsOptional()
  @IsString({ message: 'notes harus berupa string' })
  notes?: string;
}

export class CreateOrderDto {
  @IsNotEmpty({ message: 'branch_id wajib diisi' })
  @IsNumber({}, { message: 'branch_id harus berupa angka' })
  branch_id!: number;

  @IsNotEmpty({ message: 'customer_id wajib diisi' })
  @IsNumber({}, { message: 'customer_id harus berupa angka' })
  customer_id!: number;

  @IsOptional()
  @IsNumber({}, { message: 'pickup_address_id harus berupa angka' })
  pickup_address_id?: number;

  @IsOptional()
  @IsNumber({}, { message: 'delivery_address_id harus berupa angka' })
  delivery_address_id?: number;

  @IsOptional()
  @IsNumber({}, { message: 'estimated_weight harus berupa angka' })
  @IsPositive({ message: 'estimated_weight harus lebih besar dari 0' })
  estimated_weight?: number;

  @IsOptional()
  @IsNumber({}, { message: 'discount_id harus berupa angka' })
  discount_id?: number;

  @IsOptional()
  @IsNumber({}, { message: 'membership_id harus berupa angka' })
  membership_id?: number;

  @IsArray({ message: 'items harus berupa array' })
  @ArrayMinSize(1, { message: 'Order minimal harus memiliki 1 item layanan' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
