import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Laporan & Analitik (Reports & Analytics)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Laporan Omzet & Pendapatan
   * GET /v1/reports/revenue
   */
  @ApiOperation({ summary: 'Laporan omzet, pendapatan, dan statistik pesanan (Owner/Admin)' })
  @ApiResponse({ status: 200, description: 'Ringkasan laporan omzet' })
  @Get('revenue')
  async getRevenueReport(
    @CurrentUser() user: JwtPayload,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getRevenueReport(user.tenant_id, filter);
  }

  /**
   * Laporan Performa Antar Cabang
   * GET /v1/reports/branch-performance
   */
  @ApiOperation({ summary: 'Perbandingan omzet dan performa antar cabang outlet (Owner/Admin)' })
  @ApiResponse({ status: 200, description: 'Statistik performa cabang' })
  @Get('branch-performance')
  async getBranchPerformance(
    @CurrentUser() user: JwtPayload,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getBranchPerformance(user.tenant_id, filter);
  }

  /**
   * Statistik Kinerja Kurir
   * GET /v1/reports/courier-statistics
   */
  @ApiOperation({ summary: 'Statistik aktivitas tracking dan kinerja kurir (Owner/Admin)' })
  @ApiResponse({ status: 200, description: 'Statistik kinerja kurir' })
  @Get('courier-statistics')
  async getCourierStatistics(
    @CurrentUser() user: JwtPayload,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportService.getCourierStatistics(user.tenant_id, filter);
  }
}
