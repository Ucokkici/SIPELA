import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Autentikasi (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login employee atau customer
   * POST /v1/auth/login
   */
  @Public()
  @ApiOperation({ summary: 'Login Pegawai / Customer' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan token JWT' })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Memperbarui access token
   * POST /v1/auth/refresh
   */
  @Public()
  @ApiOperation({ summary: 'Perpanjangan Access Token dengan Refresh Token' })
  @ApiResponse({ status: 200, description: 'Access token baru berhasil digenerate' })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  /**
   * Mengambil detail profil user yang sedang login
   * GET /v1/auth/me
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan profil akun yang sedang terautentikasi' })
  @ApiResponse({ status: 200, description: 'Data profil user aktif' })
  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub, user.type);
  }
}
