import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Laporan Omzet, Pendapatan, dan Breakdown Transaksi
   * Endpoint: GET /v1/reports/revenue
   */
  async getRevenueReport(tenantId: number, filter: ReportFilterDto) {
    const whereOrder: Prisma.OrderWhereInput = {
      tenantId: BigInt(tenantId),
      ...(filter.branch_id ? { branchId: BigInt(filter.branch_id) } : {}),
      ...(filter.start_date || filter.end_date
        ? {
            createdAt: {
              ...(filter.start_date ? { gte: new Date(filter.start_date) } : {}),
              ...(filter.end_date ? { lte: new Date(filter.end_date) } : {}),
            },
          }
        : {}),
    };

    // Ambil seluruh order
    const orders = await this.prisma.order.findMany({
      where: whereOrder,
      include: { payments: true },
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'done').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    // Hitung total omzet dari pesanan yang dibayar
    let totalRevenue = 0;
    const paymentMethodsBreakdown: Record<string, number> = {
      cash: 0,
      qris: 0,
      transfer: 0,
      ewallet: 0,
    };

    for (const o of orders) {
      for (const p of o.payments) {
        if (p.status === 'success') {
          const amt = Number(p.amount);
          totalRevenue += amt;
          if (paymentMethodsBreakdown[p.method] !== undefined) {
            paymentMethodsBreakdown[p.method] += amt;
          } else {
            paymentMethodsBreakdown[p.method] = amt;
          }
        }
      }
    }

    const averageOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Breakdown status order
    const statusBreakdown: Record<string, number> = {};
    for (const o of orders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    }

    return {
      success: true,
      data: {
        summary: {
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          average_order_value: averageOrderValue,
        },
        payment_methods: paymentMethodsBreakdown,
        orders_by_status: statusBreakdown,
      },
    };
  }

  /**
   * Laporan Performa Antar Cabang Outlet
   * Endpoint: GET /v1/reports/branch-performance
   */
  async getBranchPerformance(tenantId: number, filter: ReportFilterDto) {
    const branches = await this.prisma.branch.findMany({
      where: {
        tenantId: BigInt(tenantId),
        ...(filter.branch_id ? { id: BigInt(filter.branch_id) } : {}),
      },
      include: {
        orders: {
          include: { payments: true },
        },
        employees: true,
      },
    });

    const performance = branches.map((b) => {
      let branchRevenue = 0;
      let completedCount = 0;

      for (const o of b.orders) {
        if (o.status === 'done') completedCount++;
        for (const p of o.payments) {
          if (p.status === 'success') {
            branchRevenue += Number(p.amount);
          }
        }
      }

      return {
        branch_id: Number(b.id),
        branch_name: b.name,
        location: b.location,
        is_main_branch: b.isMainBranch,
        total_orders: b.orders.length,
        completed_orders: completedCount,
        total_revenue: branchRevenue,
        total_employees: b.employees.length,
      };
    });

    return {
      success: true,
      data: performance,
    };
  }

  /**
   * Statistik Aktivitas dan Kinerja Kurir
   * Endpoint: GET /v1/reports/courier-statistics
   */
  async getCourierStatistics(tenantId: number, filter: ReportFilterDto) {
    const couriers = await this.prisma.courier.findMany({
      where: {
        tenantId: BigInt(tenantId),
        ...(filter.branch_id ? { branchId: BigInt(filter.branch_id) } : {}),
      },
      include: {
        locationLogs: true,
      },
    });

    const stats = couriers.map((c) => ({
      courier_id: Number(c.id),
      name: c.name,
      phone: c.phone,
      vehicle_type: c.vehicleType,
      plate_number: c.plateNumber,
      status: c.status,
      total_gps_pings: c.locationLogs.length,
    }));

    return {
      success: true,
      data: stats,
    };
  }
}
