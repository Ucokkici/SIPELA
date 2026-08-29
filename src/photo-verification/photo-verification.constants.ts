import { OrderStatus } from '../order/order.constants';

/**
 * Status order yang mewajibkan bukti foto:
 * 1. PICKUP - saat kurir mengambil cucian dari pelanggan
 * 2. RECEIVED - saat kasir menerima & menimbang di outlet
 * 3. DELIVERY - saat kurir menyerahkan cucian selesai ke pelanggan
 */
export const PHOTO_REQUIRED_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PICKUP,
  OrderStatus.RECEIVED,
  OrderStatus.DELIVERY,
] as const;
