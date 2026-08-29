// =====================================================================
// SIPELA — Konstanta & Tipe Status Berat Order (Weight Status)
// =====================================================================

export enum WeightStatus {
  NOT_REQUIRED = 'not_required', // Order walk-in atau tanpa estimasi awal
  PENDING = 'pending',           // Menunggu penimbangan kasir di outlet
  MATCHED = 'matched',           // Berat aktual sesuai toleransi estimasi
  MISMATCHED = 'mismatched',     // Berat aktual melebihi batas toleransi
  CONFIRMED = 'confirmed',       // Selisih berat telah disetujui pelanggan
}

/**
 * Status berat yang mengizinkan order untuk lanjut ke tahap 'process'
 */
export const ALLOWED_PROCESS_WEIGHT_STATUSES: readonly WeightStatus[] = [
  WeightStatus.MATCHED,
  WeightStatus.CONFIRMED,
  WeightStatus.NOT_REQUIRED,
] as const;

/**
 * Toleransi default jika tenant belum mengonfigurasi toleransi custom (10%)
 */
export const DEFAULT_WEIGHT_TOLERANCE_PERCENT = 10.0;
