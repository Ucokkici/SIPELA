import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload, AuthTokens } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login pengguna (Employee / Staff / Kasir / Owner / Kurir / Customer)
   * Endpoint: POST /auth/login
   */
  async login(dto: LoginDto): Promise<{ success: boolean; data: AuthTokens }> {
    // 1. Cari pengguna di tabel Employee terlebih dahulu
    const employee = await this.prisma.employee.findUnique({
      where: { email: dto.email },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (employee) {
      if (employee.status !== 'active') {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Akun pegawai Anda sedang nonaktif atau disuspend',
          },
        });
      }

      // 2. Verifikasi Password menggunakan bcrypt
      const isPasswordValid = await this.verifyPassword(
        dto.password,
        employee.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau password yang Anda masukkan salah',
          },
        });
      }

      const payload: JwtPayload = {
        sub: Number(employee.id),
        email: employee.email,
        tenant_id: Number(employee.tenantId),
        branch_id: Number(employee.branchId),
        role: employee.role,
        type: 'employee',
      };

      const tokens = await this.generateTokens(payload);

      this.logger.log(
        `Pegawai #${employee.id} (${employee.fullName}, role: ${employee.role}) berhasil login ke tenant #${employee.tenantId}`,
      );

      return {
        success: true,
        data: {
          ...tokens,
          role: employee.role,
          user: {
            id: Number(employee.id),
            email: employee.email,
            name: employee.fullName,
            tenant_id: Number(employee.tenantId),
            branch_id: Number(employee.branchId),
            role: employee.role,
            type: 'employee',
          },
        },
      };
    }

    // Jika tidak ditemukan di employee maupun customer
    throw new UnauthorizedException({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau password yang Anda masukkan salah',
      },
    });
  }

  /**
   * Memperbarui access token dengan refresh token yang masih valid.
   * Endpoint: POST /auth/refresh
   */
  async refreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ success: boolean; data: { access_token: string } }> {
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'sipela_super_secret_refresh_key_2026',
      );

      const decoded: JwtPayload = this.jwtService.verify(dto.refresh_token, {
        secret: refreshSecret,
      });

      // Validasi ulang keberadaan user di database
      const employee = await this.prisma.employee.findUnique({
        where: { id: BigInt(decoded.sub) },
      });

      if (!employee || employee.status !== 'active') {
        throw new UnauthorizedException();
      }

      const newPayload: JwtPayload = {
        sub: Number(employee.id),
        email: employee.email,
        tenant_id: Number(employee.tenantId),
        branch_id: Number(employee.branchId),
        role: employee.role,
        type: 'employee',
      };

      const access_token = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'sipela_super_secret_jwt_key_2026',
        ),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
      });

      return {
        success: true,
        data: {
          access_token,
        },
      };
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token tidak valid atau telah kedaluwarsa',
        },
      });
    }
  }

  /**
   * Mengambil profil akun user yang sedang aktif.
   * Endpoint: GET /auth/me
   */
  async getProfile(userId: number, type: 'employee' | 'customer') {
    if (type === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: BigInt(userId) },
        include: {
          tenant: true,
          branch: true,
          courierProfile: true,
        },
      });

      if (!employee) {
        throw new UnauthorizedException();
      }

      const { password, ...safeEmployee } = employee;
      return {
        success: true,
        data: safeEmployee,
      };
    }

    throw new UnauthorizedException();
  }

  /**
   * Helper verifikasi password dengan bcrypt
   */
  private async verifyPassword(
    plain: string,
    hashed: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hashed);
    } catch {
      return plain === hashed;
    }
  }

  /**
   * Helper membuat pasangan access token dan refresh token
   */
  private async generateTokens(
    payload: JwtPayload,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'sipela_super_secret_jwt_key_2026',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'sipela_super_secret_refresh_key_2026',
    );

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }
}
