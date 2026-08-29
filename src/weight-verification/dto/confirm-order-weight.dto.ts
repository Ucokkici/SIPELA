import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ConfirmOrderWeightDto {
  @IsNotEmpty({ message: 'confirmed wajib diisi' })
  @IsBoolean({ message: 'confirmed harus bernilai boolean (true/false)' })
  confirmed!: boolean;
}
