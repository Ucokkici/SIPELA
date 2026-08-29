import { HttpException, HttpStatus } from '@nestjs/common';
import { OrderStatus } from '../../order/order.constants';

export class PhotoRequiredException extends HttpException {
  constructor(targetStatus: OrderStatus | string) {
    super(
      {
        success: false,
        error: {
          code: 'PHOTO_REQUIRED',
          message: `Foto bukti wajib diunggah untuk status ${targetStatus}`,
          details: {
            field: 'photo_url',
            target_status: targetStatus,
          },
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY, // 422
    );
  }
}
