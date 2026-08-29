import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '../order/order.constants';
import { PHOTO_REQUIRED_STATUSES } from './photo-verification.constants';
import { PhotoRequiredException } from './exceptions/photo-required.exception';

@Injectable()
export class PhotoVerificationService {
  private readonly logger = new Logger(PhotoVerificationService.name);

  /**
   * Memeriksa apakah suatu status order mewajibkan upload foto bukti.
   * @param targetStatus Status target perpindahan
   */
  isPhotoRequired(targetStatus: OrderStatus): boolean {
    return PHOTO_REQUIRED_STATUSES.includes(targetStatus);
  }

  /**
   * Memvalidasi apakah bukti foto telah disertakan untuk status yang mewajibkannya.
   * Melempar PhotoRequiredException (HTTP 422) jika foto wajib namun tidak ada.
   * @param targetStatus Status target
   * @param photoUrl URL foto dari request body
   */
  validatePhotoRequirement(
    targetStatus: OrderStatus,
    photoUrl?: string | null,
  ): void {
    if (this.isPhotoRequired(targetStatus)) {
      if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
        this.logger.warn(
          `Validasi foto gagal: status '${targetStatus}' mewajibkan foto bukti, tetapi photo_url tidak disediakan.`,
        );
        throw new PhotoRequiredException(targetStatus);
      }
    }
  }
}
