// =====================================================================
// SIPELA — Konstanta & Tipe Status Order (State Machine)
// =====================================================================

export enum OrderStatus {
  PENDING = 'pending',
  PICKUP = 'pickup',
  RECEIVED = 'received',
  PROCESS = 'process',
  DELIVERY = 'delivery',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/**
 * Matriks Transisi Status Order:
 * - Alur linear: pending -> pickup -> received -> process -> delivery -> done
 * - Pembatalan (cancelled): hanya diizinkan sebelum status 'process' dimulai
 *   (yaitu dari pending, pickup, atau received).
 * - Status 'done' dan 'cancelled' adalah terminal state (tidak ada transisi lanjutan).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.PICKUP]: [OrderStatus.RECEIVED, OrderStatus.CANCELLED],
  [OrderStatus.RECEIVED]: [OrderStatus.PROCESS, OrderStatus.CANCELLED],
  [OrderStatus.PROCESS]: [OrderStatus.DELIVERY],
  [OrderStatus.DELIVERY]: [OrderStatus.DONE],
  [OrderStatus.DONE]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Status yang diizinkan untuk dibatalkan (sebelum masuk tahap 'process')
 */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PICKUP,
  OrderStatus.RECEIVED,
] as const;

/**
 * Status terminal akhir siklus hidup order
 */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DONE,
  OrderStatus.CANCELLED,
] as const;
