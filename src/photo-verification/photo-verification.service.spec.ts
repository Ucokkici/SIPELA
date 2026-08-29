import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PhotoVerificationService } from './photo-verification.service';
import { OrderStatus } from '../order/order.constants';
import { PhotoRequiredException } from './exceptions/photo-required.exception';

describe('PhotoVerificationService', () => {
  let service: PhotoVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotoVerificationService],
    }).compile();

    service = module.get<PhotoVerificationService>(PhotoVerificationService);
  });

  it('harus terdefinisi (defined)', () => {
    expect(service).toBeDefined();
  });

  describe('1. Pengecekan Status Wajib Foto (isPhotoRequired)', () => {
    it('harus mengembalikan true untuk status PICKUP, RECEIVED, dan DELIVERY', () => {
      expect(service.isPhotoRequired(OrderStatus.PICKUP)).toBe(true);
      expect(service.isPhotoRequired(OrderStatus.RECEIVED)).toBe(true);
      expect(service.isPhotoRequired(OrderStatus.DELIVERY)).toBe(true);
    });

    it('harus mengembalikan false untuk status non-foto (PENDING, PROCESS, DONE, CANCELLED)', () => {
      expect(service.isPhotoRequired(OrderStatus.PENDING)).toBe(false);
      expect(service.isPhotoRequired(OrderStatus.PROCESS)).toBe(false);
      expect(service.isPhotoRequired(OrderStatus.DONE)).toBe(false);
      expect(service.isPhotoRequired(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('2. Validasi Transisi Status Wajib Foto (validatePhotoRequirement)', () => {
    const photoRequiredStatuses = [
      OrderStatus.PICKUP,
      OrderStatus.RECEIVED,
      OrderStatus.DELIVERY,
    ];

    test.each(photoRequiredStatuses)(
      'harus lolos jika photo_url valid diberikan untuk status %s',
      (status) => {
        expect(() =>
          service.validatePhotoRequirement(
            status,
            'https://cdn.sipela.id/proofs/123.jpg',
          ),
        ).not.toThrow();
      },
    );

    test.each(photoRequiredStatuses)(
      'harus melempar PhotoRequiredException (422) jika photo_url tidak ada / undefined untuk status %s',
      (status) => {
        expect(() =>
          service.validatePhotoRequirement(status, undefined),
        ).toThrow(PhotoRequiredException);
      },
    );

    test.each(photoRequiredStatuses)(
      'harus melempar PhotoRequiredException (422) jika photo_url bernilai null untuk status %s',
      (status) => {
        expect(() =>
          service.validatePhotoRequirement(status, null),
        ).toThrow(PhotoRequiredException);
      },
    );

    test.each(photoRequiredStatuses)(
      'harus melempar PhotoRequiredException (422) jika photo_url string kosong / spasi untuk status %s',
      (status) => {
        expect(() =>
          service.validatePhotoRequirement(status, '   '),
        ).toThrow(PhotoRequiredException);
      },
    );
  });

  describe('3. Validasi Transisi Status Tidak Wajib Foto', () => {
    const nonPhotoStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PROCESS,
      OrderStatus.DONE,
      OrderStatus.CANCELLED,
    ];

    test.each(nonPhotoStatuses)(
      'harus tetap lolos meskipun photo_url tidak disediakan untuk status %s',
      (status) => {
        expect(() =>
          service.validatePhotoRequirement(status, undefined),
        ).not.toThrow();
        expect(() =>
          service.validatePhotoRequirement(status, null),
        ).not.toThrow();
        expect(() =>
          service.validatePhotoRequirement(status, ''),
        ).not.toThrow();
      },
    );
  });

  describe('4. Struktur Payload Exception 422 PHOTO_REQUIRED', () => {
    it('harus menghasilkan error response sesuai spesifikasi CleanTrack/SIPELA', () => {
      try {
        service.validatePhotoRequirement(OrderStatus.PICKUP, undefined);
        fail('Seharusnya melempar PhotoRequiredException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(PhotoRequiredException);
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY); // 422

        const response = error.getResponse();
        expect(response).toEqual({
          success: false,
          error: {
            code: 'PHOTO_REQUIRED',
            message: 'Foto bukti wajib diunggah untuk status pickup',
            details: {
              field: 'photo_url',
              target_status: 'pickup',
            },
          },
        });
      }
    });
  });
});
