import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator untuk menandai route publik yang tidak membutuhkan JWT token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
