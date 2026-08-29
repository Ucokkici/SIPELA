import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatus } from './order.constants';
import { InvalidStatusTransitionException } from './exceptions/invalid-status-transition.exception';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderStateMachineService],
    }).compile();

    service = module.get<OrderStateMachineService>(OrderStateMachineService);
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Transisi Linear Valid', () => {
    const validLinearTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING, OrderStatus.PICKUP],
      [OrderStatus.PICKUP, OrderStatus.RECEIVED],
      [OrderStatus.RECEIVED, OrderStatus.PROCESS],
      [OrderStatus.PROCESS, OrderStatus.DELIVERY],
      [OrderStatus.DELIVERY, OrderStatus.DONE],
    ];

    test.each(validLinearTransitions)(
      'harus mengizinkan transisi valid: %s -> %s',
      (current, target) => {
        expect(service.canTransition(current, target)).toBe(true);
        expect(() => service.validateTransition(current, target)).not.toThrow();
      },
    );
  });

  describe('2. Transisi Pembatalan (Cancelled) yang Valid', () => {
    const validCancellationTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PICKUP, OrderStatus.CANCELLED],
      [OrderStatus.RECEIVED, OrderStatus.CANCELLED],
    ];

    test.each(validCancellationTransitions)(
      'harus mengizinkan pembatalan dari status sebelum process: %s -> %s',
      (current, target) => {
        expect(service.canTransition(current, target)).toBe(true);
        expect(() => service.validateTransition(current, target)).not.toThrow();
      },
    );
  });

  describe('3. Transisi Pembatalan (Cancelled) yang Ditolak (setelah atau saat process)', () => {
    const invalidCancellationTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PROCESS, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.DONE, OrderStatus.CANCELLED],
    ];

    test.each(invalidCancellationTransitions)(
      'harus menolak pembatalan dari status: %s -> %s',
      (current, target) => {
        expect(service.canTransition(current, target)).toBe(false);
        expect(() => service.validateTransition(current, target)).toThrow(
          InvalidStatusTransitionException,
        );
      },
    );
  });

  describe('4. Transisi Mundur (Backward Transitions) yang Ditolak', () => {
    const backwardTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PICKUP, OrderStatus.PENDING],
      [OrderStatus.RECEIVED, OrderStatus.PICKUP],
      [OrderStatus.RECEIVED, OrderStatus.PENDING],
      [OrderStatus.PROCESS, OrderStatus.RECEIVED],
      [OrderStatus.PROCESS, OrderStatus.PICKUP],
      [OrderStatus.PROCESS, OrderStatus.PENDING],
      [OrderStatus.DELIVERY, OrderStatus.PROCESS],
      [OrderStatus.DELIVERY, OrderStatus.RECEIVED],
      [OrderStatus.DONE, OrderStatus.DELIVERY],
      [OrderStatus.DONE, OrderStatus.PROCESS],
    ];

    test.each(backwardTransitions)(
      'harus menolak transisi mundur: %s -> %s',
      (current, target) => {
        expect(service.canTransition(current, target)).toBe(false);
        expect(() => service.validateTransition(current, target)).toThrow(
          InvalidStatusTransitionException,
        );
      },
    );
  });

  describe('5. Transisi Melompat (Skip Transitions) yang Ditolak', () => {
    const skipTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING, OrderStatus.PROCESS],
      [OrderStatus.PENDING, OrderStatus.DELIVERY],
      [OrderStatus.PENDING, OrderStatus.DONE],
      [OrderStatus.PICKUP, OrderStatus.PROCESS],
      [OrderStatus.PICKUP, OrderStatus.DELIVERY],
      [OrderStatus.PICKUP, OrderStatus.DONE],
      [OrderStatus.RECEIVED, OrderStatus.DELIVERY],
      [OrderStatus.RECEIVED, OrderStatus.DONE],
      [OrderStatus.PROCESS, OrderStatus.DONE],
    ];

    test.each(skipTransitions)(
      'harus menolak transisi melompat: %s -> %s',
      (current, target) => {
        expect(service.canTransition(current, target)).toBe(false);
        expect(() => service.validateTransition(current, target)).toThrow(
          InvalidStatusTransitionException,
        );
      },
    );
  });

  describe('6. Transisi dari Terminal Status (DONE & CANCELLED) yang Ditolak', () => {
    const allStatuses = Object.values(OrderStatus);

    test.each(allStatuses)(
      'status DONE tidak boleh bertransisi ke status manapun (termasuk %s)',
      (target) => {
        expect(service.canTransition(OrderStatus.DONE, target)).toBe(false);
        expect(() =>
          service.validateTransition(OrderStatus.DONE, target),
        ).toThrow(InvalidStatusTransitionException);
      },
    );

    test.each(allStatuses)(
      'status CANCELLED tidak boleh bertransisi ke status manapun (termasuk %s)',
      (target) => {
        expect(service.canTransition(OrderStatus.CANCELLED, target)).toBe(false);
        expect(() =>
          service.validateTransition(OrderStatus.CANCELLED, target),
        ).toThrow(InvalidStatusTransitionException);
      },
    );
  });

  describe('7. Transisi ke Status Sama (Self Transitions) yang Ditolak', () => {
    const allStatuses = Object.values(OrderStatus);

    test.each(allStatuses)(
      'tidak boleh transisi ke status yang sama: %s -> %s',
      (status) => {
        expect(service.canTransition(status, status)).toBe(false);
        expect(() => service.validateTransition(status, status)).toThrow(
          InvalidStatusTransitionException,
        );
      },
    );
  });

  describe('8. Struktur Exception & Payload HTTP 422', () => {
    it('harus melempar HTTP 422 dengan struktur payload error standar CleanTrack/SIPELA', () => {
      try {
        service.validateTransition(OrderStatus.PROCESS, OrderStatus.CANCELLED);
        fail('Seharusnya melempar InvalidStatusTransitionException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionException);
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY); // 422

        const response = error.getResponse();
        expect(response).toEqual({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message:
              "Transisi status order dari 'process' ke 'cancelled' tidak diizinkan",
            details: {
              current_status: 'process',
              target_status: 'cancelled',
              allowed_transitions: ['delivery'],
            },
          },
        });
      }
    });
  });

  describe('9. Helper Methods: isCancellable & isTerminal', () => {
    it('isCancellable harus bernilai true hanya untuk status sebelum process', () => {
      expect(service.isCancellable(OrderStatus.PENDING)).toBe(true);
      expect(service.isCancellable(OrderStatus.PICKUP)).toBe(true);
      expect(service.isCancellable(OrderStatus.RECEIVED)).toBe(true);

      expect(service.isCancellable(OrderStatus.PROCESS)).toBe(false);
      expect(service.isCancellable(OrderStatus.DELIVERY)).toBe(false);
      expect(service.isCancellable(OrderStatus.DONE)).toBe(false);
      expect(service.isCancellable(OrderStatus.CANCELLED)).toBe(false);
    });

    it('isTerminal harus bernilai true hanya untuk status DONE dan CANCELLED', () => {
      expect(service.isTerminal(OrderStatus.DONE)).toBe(true);
      expect(service.isTerminal(OrderStatus.CANCELLED)).toBe(true);

      expect(service.isTerminal(OrderStatus.PENDING)).toBe(false);
      expect(service.isTerminal(OrderStatus.PICKUP)).toBe(false);
      expect(service.isTerminal(OrderStatus.RECEIVED)).toBe(false);
      expect(service.isTerminal(OrderStatus.PROCESS)).toBe(false);
      expect(service.isTerminal(OrderStatus.DELIVERY)).toBe(false);
    });
  });
});
