import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MasterService } from './master.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Master Data (Services, Branches, Employees, Discounts)')
@Controller()
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  // ==========================================
  // 1. LAYANAN (SERVICES)
  // ==========================================

  @Public()
  @ApiOperation({ summary: 'Mendapatkan seluruh daftar katalog layanan laundry (Publik & Internal)' })
  @ApiQuery({ name: 'branch_id', required: false, type: Number })
  @ApiQuery({ name: 'tenant_id', required: false, type: Number })
  @Get('services')
  async getServices(
    @CurrentUser() user?: JwtPayload,
    @Query('branch_id') branchId?: number,
    @Query('tenant_id') tenantIdQuery?: number,
  ) {
    const tenantId = user?.tenant_id || (tenantIdQuery ? Number(tenantIdQuery) : undefined);
    return this.masterService.getServices(tenantId, branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Menambahkan paket layanan baru' })
  @Post('services')
  async createService(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateServiceDto,
  ) {
    return this.masterService.createService(user.tenant_id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Memperbarui paket layanan' })
  @Patch('services/:id')
  async updateService(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.masterService.updateService(user.tenant_id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Menonaktifkan paket layanan' })
  @Delete('services/:id')
  async deleteService(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.masterService.deleteService(user.tenant_id, id);
  }

  // ==========================================
  // 2. CABANG (BRANCHES)
  // ==========================================

  @Public()
  @ApiOperation({ summary: 'Mendapatkan seluruh cabang outlet laundry (Publik & Internal)' })
  @ApiQuery({ name: 'tenant_id', required: false, type: Number })
  @Get('branches')
  async getBranches(
    @CurrentUser() user?: JwtPayload,
    @Query('tenant_id') tenantIdQuery?: number,
  ) {
    const tenantId = user?.tenant_id || (tenantIdQuery ? Number(tenantIdQuery) : undefined);
    return this.masterService.getBranches(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Owner membuat cabang outlet baru' })
  @Post('branches')
  async createBranch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBranchDto,
  ) {
    return this.masterService.createBranch(user.tenant_id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Owner memperbarui profil cabang outlet' })
  @Patch('branches/:id')
  async updateBranch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.masterService.updateBranch(user.tenant_id, id, dto);
  }

  // ==========================================
  // 3. PEGAWAI (EMPLOYEES)
  // ==========================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Mendapatkan seluruh pegawai di tenant' })
  @ApiQuery({ name: 'branch_id', required: false, type: Number })
  @Get('employees')
  async getEmployees(
    @CurrentUser() user: JwtPayload,
    @Query('branch_id') branchId?: number,
  ) {
    return this.masterService.getEmployees(user.tenant_id, branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Mendaftarkan akun pegawai baru' })
  @Post('employees')
  async createEmployee(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.masterService.createEmployee(user.tenant_id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Memperbarui data pegawai' })
  @Patch('employees/:id')
  async updateEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.masterService.updateEmployee(user.tenant_id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Menonaktifkan pegawai' })
  @Delete('employees/:id')
  async deleteEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.masterService.deleteEmployee(user.tenant_id, id);
  }

  // ==========================================
  // 4. DISKON (DISCOUNTS)
  // ==========================================

  @Public()
  @ApiOperation({ summary: 'Mendapatkan seluruh daftar promo & diskon aktif' })
  @ApiQuery({ name: 'branch_id', required: false, type: Number })
  @ApiQuery({ name: 'tenant_id', required: false, type: Number })
  @Get('discounts')
  async getDiscounts(
    @CurrentUser() user?: JwtPayload,
    @Query('branch_id') branchId?: number,
    @Query('tenant_id') tenantIdQuery?: number,
  ) {
    const tenantId = user?.tenant_id || (tenantIdQuery ? Number(tenantIdQuery) : undefined);
    return this.masterService.getDiscounts(tenantId, branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Membuat promo diskon / voucher baru' })
  @Post('discounts')
  async createDiscount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.masterService.createDiscount(user.tenant_id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Memperbarui promo diskon' })
  @Patch('discounts/:id')
  async updateDiscount(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.masterService.updateDiscount(user.tenant_id, id, dto);
  }
}
