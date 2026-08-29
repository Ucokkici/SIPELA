import { Module } from '@nestjs/common';
import { PhotoVerificationService } from './photo-verification.service';

@Module({
  providers: [PhotoVerificationService],
  exports: [PhotoVerificationService],
})
export class PhotoVerificationModule {}
