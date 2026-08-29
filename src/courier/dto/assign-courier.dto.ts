import { IsNotEmpty, IsNumber } from 'class-validator';

export class AssignCourierDto {
  @IsNotEmpty({ message: 'courier_id wajib diisi' })
  @IsNumber({}, { message: 'courier_id harus berupa angka' })
  courier_id!: number;
}
