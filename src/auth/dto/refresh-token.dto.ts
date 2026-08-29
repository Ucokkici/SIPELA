import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'refresh_token wajib disertakan' })
  @IsString({ message: 'refresh_token harus berupa string' })
  refresh_token!: string;
}
