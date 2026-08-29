import { HttpException, HttpStatus } from '@nestjs/common';
import { OrderStatus } from '../order.constants';

export class InvalidStatusTransitionException extends HttpException {
  constructor(
    currentStatus: OrderStatus | string,
    targetStatus: OrderStatus | string,
    allowedTransitions: OrderStatus[] = [],
  ) {
    super(
      {
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Transisi status order dari '${currentStatus}' ke '${targetStatus}' tidak diizinkan`,
          details: {
            current_status: currentStatus,
            target_status: targetStatus,
            allowed_transitions: allowedTransitions,
          },
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY, // 422
    );
  }
}
