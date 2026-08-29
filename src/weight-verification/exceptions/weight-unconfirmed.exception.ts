import { HttpException, HttpStatus } from '@nestjs/common';
import { WeightStatus } from '../weight-verification.constants';

export class WeightUnconfirmedException extends HttpException {
  constructor(currentWeightStatus: WeightStatus | string) {
    super(
      {
        success: false,
        error: {
          code: 'WEIGHT_NOT_CONFIRMED',
          message:
            'Order tidak dapat diproses karena terdapat selisih berat yang belum dikonfirmasi oleh pelanggan',
          details: {
            weight_status: currentWeightStatus,
            resolution:
              'Minta pelanggan untuk mengonfirmasi penyesuaian berat via WhatsApp atau aplikasi sebelum melanjutkan ke status process',
          },
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY, // 422
    );
  }
}
