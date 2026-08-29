// =====================================================================
// SIPELA — Konstanta Modul Notifikasi & BullMQ Queue
// =====================================================================

export const NOTIFICATION_QUEUE = 'notification_queue';

export const JOB_SEND_WEIGHT_MISMATCH_WA = 'send_weight_mismatch_wa';
export const JOB_SEND_ORDER_STATUS_NOTIFICATION = 'send_order_status_notification';

export const WEIGHT_ACTION_CONFIRM_PREFIX = 'WEIGHT_CONFIRM_';
export const WEIGHT_ACTION_REJECT_PREFIX = 'WEIGHT_REJECT_';

export interface WeightMismatchJobPayload {
  order_id: number;
  customer_phone: string;
  customer_name?: string;
  estimated_weight: number;
  actual_weight: number;
  total_amount: number;
}
