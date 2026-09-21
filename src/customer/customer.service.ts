import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membuat/mendaftarkan pelanggan baru
   */
  async createCustomer(dto: CreateCustomerDto) {
    const tenantId = BigInt(dto.tenant_id);
    const branchId = BigInt(dto.branch_id);

    // 1. Validasi cabang & tenant
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId: tenantId,
      },
    });

    if (!branch) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: `Cabang dengan ID ${dto.branch_id} tidak ditemukan pada tenant ini`,
        },
      });
    }

    // 2. Cek apakah customer dengan phone yang sama sudah terdaftar di tenant ini
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        tenantId: tenantId,
        phone: dto.phone,
      },
    });

    if (existingCustomer) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CUSTOMER_ALREADY_EXISTS',
          message: `Pelanggan dengan nomor HP ${dto.phone} sudah terdaftar`,
        },
      });
    }

    // 3. Simpan data Customer dan Alamat jika ada
    const customer = await this.prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: {
          tenantId: tenantId,
          branchId: branchId,
          name: dto.name,
          phone: dto.phone,
        },
      });

      if (dto.address) {
        await tx.customerAddress.create({
          data: {
            customerId: newCustomer.id,
            location: dto.address,
            isDefault: true,
          },
        });
      }

      return newCustomer;
    });

    this.logger.log(`Pelanggan baru #${customer.id} (${customer.name}) berhasil terdaftar`);

    return {
      success: true,
      data: {
        id: Number(customer.id),
        tenant_id: Number(customer.tenantId),
        branch_id: Number(customer.branchId),
        name: customer.name,
        phone: customer.phone,
        created_at: customer.createdAt,
      },
    };
  }

  /**
   * Mengambil daftar pelanggan (dengan search & pagination)
   */
  async getCustomers(tenantId: number, query: QueryCustomerDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenantId: BigInt(tenantId),
    };

    if (query.branch_id) {
      where.branchId = BigInt(query.branch_id);
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: true,
          addresses: true,
        },
      }),
    ]);

    return {
      success: true,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      data: customers,
    };
  }

  /**
   * Mengambil detail pelanggan berdasarkan ID
   */
  async getCustomerById(tenantId: number, id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: BigInt(id),
        tenantId: BigInt(tenantId),
      },
      include: {
        branch: true,
        addresses: true,
        memberships: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: `Pelanggan dengan ID ${id} tidak ditemukan`,
        },
      });
    }

    return {
      success: true,
      data: customer,
    };
  }
}
