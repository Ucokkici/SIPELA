import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

/**
 * TenantGuard — Mencegah akses lintas tenant (IDOR Protection)
 * Sesuai SDD §4 dan FR-1.1:
 * Setiap request terautentikasi wajib mencocokkan tenant_id user dengan resource yang diakses.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Ekstrak tenant_id dari user terautentikasi (JWT payload) atau header tenant
    const userTenantId =
      request.user?.tenant_id || request.user?.tenantId || request.headers['x-tenant-id'];

    // Jika endpoint bersifat publik atau belum diproteksi JWT, loloskan
    if (!userTenantId) {
      return true;
    }

    // 2. Jika request body / param membawa tenant_id yang berbeda, tolak request (IDOR prevention)
    const targetTenantId =
      request.body?.tenant_id ||
      request.body?.tenantId ||
      request.params?.tenant_id ||
      request.query?.tenant_id;

    if (targetTenantId && String(targetTenantId) !== String(userTenantId)) {
      this.logger.warn(
        `🚨 [IDOR_DETECTED] Akses lintas tenant ditolak! User Tenant: ${userTenantId}, Target Tenant: ${targetTenantId}`,
      );
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'TENANT_ACCESS_FORBIDDEN',
          message: 'Anda tidak memiliki akses ke data tenant lain',
        },
      });
    }

    // 3. Menyimpan konteks tenant yang tervalidasi ke request
    // PENGAMANAN: Konversi ke BigInt hanya jika berupa karakter angka murni
    const tenantStr = String(userTenantId);
    if (/^\d+$/.test(tenantStr)) {
      request.tenantId = BigInt(tenantStr);
    } else {
      request.tenantId = userTenantId;
    }

    return true;
  }
}
