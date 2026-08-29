import { Injectable, Logger } from '@nestjs/common';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  TERMINAL_STATUSES,
} from './order.constants';
import { InvalidStatusTransitionException } from './exceptions/invalid-status-transition.exception';

@Injectable()
export class OrderStateMachineService {
  private readonly logger = new Logger(OrderStateMachineService.name);

  /**
   * Mengembalikan daftar status berikutnya yang sah berdasarkan status saat ini.
   * @param currentStatus Status order saat ini
   */
  getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Mengecek apakah perpindahan dari currentStatus ke targetStatus diperbolehkan.
   * @param currentStatus Status saat ini
   * @param targetStatus Status tujuan
   */
  canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = this.getAllowedTransitions(currentStatus);
    return allowed.includes(targetStatus);
  }

  /**
   * Memvalidasi transisi status.
   * Jika tidak sah, langsung melempar InvalidStatusTransitionException (HTTP 422).
   * @param currentStatus Status saat ini
   * @param targetStatus Status tujuan
   */
  validateTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      const allowed = this.getAllowedTransitions(currentStatus);
      this.logger.warn(
        `Transisi status tidak valid: ${currentStatus} -> ${targetStatus}. Status yang diizinkan: [${allowed.join(', ')}]`,
      );
      throw new InvalidStatusTransitionException(
        currentStatus,
        targetStatus,
        allowed,
      );
    }
  }

  /**
   * Mengecek apakah status order saat ini masih bisa dibatalkan (sebelum masuk 'process').
   * @param status Status saat ini
   */
  isCancellable(status: OrderStatus): boolean {
    return CANCELLABLE_STATUSES.includes(status);
  }

  /**
   * Mengecek apakah status merupakan status terminal (done / cancelled).
   * @param status Status saat ini
   */
  isTerminal(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }
}
