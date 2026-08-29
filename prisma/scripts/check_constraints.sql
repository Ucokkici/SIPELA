-- =====================================================================
-- CleanTrack — Manual Migration: CHECK Constraints
-- =====================================================================
-- Migration ini menambahkan CHECK constraint yang tidak didukung secara
-- native oleh Prisma schema. Dijalankan setelah initial migration.
-- =====================================================================

-- 1. CHECK constraint untuk order.weight_status
-- Memastikan hanya nilai yang valid yang bisa disimpan
ALTER TABLE "order" ADD CONSTRAINT chk_weight_status
  CHECK (weight_status IN ('not_required', 'pending', 'matched', 'mismatched', 'confirmed'));

-- 2. CHECK constraint untuk order.status (opsional, keamanan tambahan)
-- Memastikan status order hanya berisi nilai yang valid sesuai state machine
ALTER TABLE "order" ADD CONSTRAINT chk_order_status
  CHECK (status IN ('pending', 'pickup', 'received', 'process', 'delivery', 'done', 'cancelled'));

-- 3. CHECK constraint untuk order.payment_status (opsional, keamanan tambahan)
ALTER TABLE "order" ADD CONSTRAINT chk_payment_status
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'));
