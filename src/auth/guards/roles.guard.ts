import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Jika endpoint tidak menetapkan role spesifik, loloskan
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();

    if (!user || !user.role) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ROLE_FORBIDDEN',
          message: 'Hak akses ditolak: identitas peran tidak ditemukan',
        },
      });
    }

    // Role 'owner' memiliki akses penuh ke seluruh resource
    if (user.role === 'owner') {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ROLE_FORBIDDEN',
          message: `Hak akses ditolak: endpoint ini memerlukan salah satu role: [${requiredRoles.join(', ')}]`,
          details: {
            current_role: user.role,
            required_roles: requiredRoles,
          },
        },
      });
    }

    return true;
  }
}
