import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'tenant_id wajib diisi' })
  @IsNumber({}, { message: 'tenant_id harus berupa angka' })
  tenant_id!: number;

  @IsNotEmpty({ message: 'branch_id wajib diisi' })
  @IsNumber({}, { message: 'branch_id harus berupa angka' })
  branch_id!: number;

  @IsNotEmpty({ message: 'nama customer wajib diisi' })
  @IsString({ message: 'nama customer harus berupa string' })
  name!: string;

  @IsNotEmpty({ message: 'nomor telepon customer wajib diisi' })
  @IsString({ message: 'nomor telepon customer harus berupa string' })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'alamat harus berupa string' })
  address?: string;
}
