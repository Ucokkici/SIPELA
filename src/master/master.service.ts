import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterService {
  private readonly logger = new Logger(MasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. MASTER LAYANAN (SERVICES)
  // ==========================================

  async getServices(tenantId: number, branchId?: number) {
    const where: Prisma.ServiceWhereInput = {
      tenantId: BigInt(tenantId),
      ...(branchId ? { branchId: BigInt(branchId) } : {}),
    };

    const services = await this.prisma.service.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: services.map((s) => ({
        id: Number(s.id),
        tenant_id: Number(s.tenantId),
        branch_id: Number(s.branchId),
        name: s.name,
        price: Number(s.price),
        is_active: s.isActive,
      })),
    };
  }

  async createService(tenantId: number, dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        tenantId: BigInt(tenantId),
        branchId: BigInt(dto.branch_id),
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        isActive: dto.is_active !== undefined ? dto.is_active : true,
      },
    });

    return {
      success: true,
      data: {
        id: Number(service.id),
        name: service.name,
        price: Number(service.price),
        is_active: service.isActive,
      },
    };
  }

  async updateService(
    tenantId: number,
    serviceId: number,
    dto: UpdateServiceDto,
  ) {
    const existing = await this.prisma.service.findFirst({
      where: { id: BigInt(serviceId), tenantId: BigInt(tenantId) },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan' },
      });
    }

    const updated = await this.prisma.service.update({
      where: { id: BigInt(serviceId) },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.price ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: Number(updated.id),
        name: updated.name,
        price: Number(updated.price),
        is_active: updated.isActive,
      },
    };
  }

  async deleteService(tenantId: number, serviceId: number) {
    return this.updateService(tenantId, serviceId, { is_active: false });
  }

  // ==========================================
  // 2. MASTER CABANG (BRANCHES)
  // ==========================================

  async getBranches(tenantId: number) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId: BigInt(tenantId) },
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: branches.map((b) => ({
        id: Number(b.id),
        tenant_id: Number(b.tenantId),
        name: b.name,
        location: b.location,
        email: b.email,
        phone: b.phone,
        long: b.long ? Number(b.long) : null,
        lat: b.lat ? Number(b.lat) : null,
        is_main_branch: b.isMainBranch,
      })),
    };
  }

  async createBranch(tenantId: number, dto: CreateBranchDto) {
    const branch = await this.prisma.branch.create({
      data: {
        tenantId: BigInt(tenantId),
        name: dto.name,
        location: dto.location,
        email: dto.email,
        phone: dto.phone,
        long: dto.long ? new Prisma.Decimal(dto.long) : null,
        lat: dto.lat ? new Prisma.Decimal(dto.lat) : null,
        isMainBranch: dto.is_main_branch || false,
      },
    });

    return {
      success: true,
      data: {
        id: Number(branch.id),
        name: branch.name,
        location: branch.location,
        is_main_branch: branch.isMainBranch,
      },
    };
  }

  async updateBranch(tenantId: number, branchId: number, dto: UpdateBranchDto) {
    const existing = await this.prisma.branch.findFirst({
      where: { id: BigInt(branchId), tenantId: BigInt(tenantId) },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'BRANCH_NOT_FOUND', message: 'Cabang tidak ditemukan' },
      });
    }

    const updated = await this.prisma.branch.update({
      where: { id: BigInt(branchId) },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.location ? { location: dto.location } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
        ...(dto.long ? { long: new Prisma.Decimal(dto.long) } : {}),
        ...(dto.lat ? { lat: new Prisma.Decimal(dto.lat) } : {}),
        ...(dto.is_main_branch !== undefined
          ? { isMainBranch: dto.is_main_branch }
          : {}),
      },
    });

    return {
      success: true,
      data: {
        id: Number(updated.id),
        name: updated.name,
        location: updated.location,
        is_main_branch: updated.isMainBranch,
      },
    };
  }

  // ==========================================
  // 3. MASTER PEGAWAI (EMPLOYEES)
  // ==========================================

  async getEmployees(tenantId: number, branchId?: number) {
    const where: Prisma.EmployeeWhereInput = {
      tenantId: BigInt(tenantId),
      ...(branchId ? { branchId: BigInt(branchId) } : {}),
    };

    const employees = await this.prisma.employee.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: employees.map((e) => ({
        id: Number(e.id),
        tenant_id: Number(e.tenantId),
        branch_id: Number(e.branchId),
        fullName: e.fullName,
        email: e.email,
        role: e.role,
        status: e.status,
      })),
    };
  }

  async createEmployee(tenantId: number, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: `Email ${dto.email} sudah terdaftar`,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const employee = await this.prisma.employee.create({
      data: {
        tenantId: BigInt(tenantId),
        branchId: BigInt(dto.branch_id),
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        status: dto.status || 'active',
      },
    });

    return {
      success: true,
      data: {
        id: Number(employee.id),
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        status: employee.status,
      },
    };
  }

  async updateEmployee(
    tenantId: number,
    employeeId: number,
    dto: UpdateEmployeeDto,
  ) {
    const existing = await this.prisma.employee.findFirst({
      where: { id: BigInt(employeeId), tenantId: BigInt(tenantId) },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Pegawai tidak ditemukan' },
      });
    }

    const dataToUpdate: Prisma.EmployeeUpdateInput = {
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.branch_id ? { branch: { connect: { id: BigInt(dto.branch_id) } } } : {}),
    };

    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.employee.update({
      where: { id: BigInt(employeeId) },
      data: dataToUpdate,
    });

    return {
      success: true,
      data: {
        id: Number(updated.id),
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    };
  }

  async deleteEmployee(tenantId: number, employeeId: number) {
    return this.updateEmployee(tenantId, employeeId, { status: 'inactive' });
  }

  // ==========================================
  // 4. MASTER DISKON (DISCOUNTS)
  // ==========================================

  async getDiscounts(tenantId: number, branchId?: number) {
    const where: Prisma.DiscountWhereInput = {
      tenantId: BigInt(tenantId),
      ...(branchId ? { branchId: BigInt(branchId) } : {}),
    };

    const discounts = await this.prisma.discount.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: discounts.map((d) => ({
        id: Number(d.id),
        tenant_id: Number(d.tenantId),
        branch_id: Number(d.branchId),
        name: d.name,
        typeDiscount: d.typeDiscount,
        percent: d.percent ? Number(d.percent) : null,
        price: d.price ? Number(d.price) : null,
        is_active: d.isActive,
      })),
    };
  }

  async createDiscount(tenantId: number, dto: CreateDiscountDto) {
    const discount = await this.prisma.discount.create({
      data: {
        tenantId: BigInt(tenantId),
        branchId: BigInt(dto.branch_id),
        name: dto.name,
        typeDiscount: dto.typeDiscount,
        percent: dto.percent ? new Prisma.Decimal(dto.percent) : null,
        price: dto.price ? new Prisma.Decimal(dto.price) : null,
        isActive: dto.is_active !== undefined ? dto.is_active : true,
      },
    });

    return {
      success: true,
      data: {
        id: Number(discount.id),
        name: discount.name,
        typeDiscount: discount.typeDiscount,
        is_active: discount.isActive,
      },
    };
  }

  async updateDiscount(
    tenantId: number,
    discountId: number,
    dto: UpdateDiscountDto,
  ) {
    const existing = await this.prisma.discount.findFirst({
      where: { id: BigInt(discountId), tenantId: BigInt(tenantId) },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DISCOUNT_NOT_FOUND', message: 'Diskon tidak ditemukan' },
      });
    }

    const updated = await this.prisma.discount.update({
      where: { id: BigInt(discountId) },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.typeDiscount ? { typeDiscount: dto.typeDiscount } : {}),
        ...(dto.percent !== undefined
          ? { percent: dto.percent ? new Prisma.Decimal(dto.percent) : null }
          : {}),
        ...(dto.price !== undefined
          ? { price: dto.price ? new Prisma.Decimal(dto.price) : null }
          : {}),
        ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: Number(updated.id),
        name: updated.name,
        typeDiscount: updated.typeDiscount,
        is_active: updated.isActive,
      },
    };
  }
}
