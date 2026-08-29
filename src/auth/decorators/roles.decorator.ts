import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator untuk membatasi akses endpoint berdasarkan role pengguna.
 * Contoh: @Roles('owner', 'admin', 'kasir')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
