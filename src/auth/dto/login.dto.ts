import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsNotEmpty({ message: 'Password wajib diisi' })
  @IsString({ message: 'Password harus berupa string' })
  @MinLength(4, { message: 'Password minimal 4 karakter' })
  password!: string;
}
