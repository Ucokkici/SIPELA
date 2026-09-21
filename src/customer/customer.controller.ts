import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Pelanggan (Customers)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Pendaftaran pelanggan baru oleh Kasir / Staff / Admin
   * POST /v1/customers
   */
  @ApiOperation({ summary: 'Mendaftarkan pelanggan baru' })
  @ApiResponse({ status: 201, description: 'Pelanggan baru berhasil didaftarkan' })
  @Post()
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(dto);
  }

  /**
   * Mengambil daftar seluruh pelanggan tenant
   * GET /v1/customers
   */
  @ApiOperation({ summary: 'Mengambil daftar pelanggan dengan filter & pagination' })
  @ApiResponse({ status: 200, description: 'Daftar pelanggan berhasil diambil' })
  @Get()
  async getCustomers(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryCustomerDto,
  ) {
    return this.customerService.getCustomers(user.tenant_id, query);
  }

  /**
   * Mengambil detail pelanggan berdasarkan ID
   * GET /v1/customers/:id
   */
  @ApiOperation({ summary: 'Mengambil detail pelanggan berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail data pelanggan' })
  @ApiResponse({ status: 404, description: 'Pelanggan tidak ditemukan' })
  @Get(':id')
  async getCustomerById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.getCustomerById(user.tenant_id, id);
  }
}
