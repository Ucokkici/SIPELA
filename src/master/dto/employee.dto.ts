import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'ID Cabang penugasan pegawai', example: 1 })
  @IsNotEmpty({ message: 'branch_id wajib diisi' })
  @IsNumber({}, { message: 'branch_id harus berupa angka' })
  branch_id!: number;

  @ApiProperty({ description: 'Nama lengkap pegawai', example: 'Maya Sari' })
  @IsNotEmpty({ message: 'fullName wajib diisi' })
  @IsString()
  fullName!: string;

  @ApiProperty({ description: 'Email unik pegawai', example: 'maya@sipela.id' })
  @IsNotEmpty({ message: 'email wajib diisi' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password akun', example: 'password123' })
  @IsNotEmpty({ message: 'password wajib diisi' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @ApiProperty({
    description: 'Role / jabatan pegawai',
    enum: ['owner', 'admin', 'kasir', 'operator', 'staff'],
    example: 'kasir',
  })
  @IsNotEmpty({ message: 'role wajib diisi' })
  @IsIn(['owner', 'admin', 'kasir', 'operator', 'staff'], {
    message: 'Role harus salah satu dari: owner, admin, kasir, operator, staff',
  })
  role!: string;

  @ApiProperty({ description: 'Status akun', enum: ['active', 'suspended', 'inactive'], example: 'active', required: false })
  @IsOptional()
  @IsIn(['active', 'suspended', 'inactive'])
  status?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
