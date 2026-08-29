// =====================================================================
// SIPELA — Database Seeder (PostgreSQL)
// =====================================================================

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses database seeding SIPELA...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Buat / Dapatkan Tenant
  const tenant = await prisma.tenant.upsert({
    where: { email: 'owner@sipela.id' },
    update: {},
    create: {
      name: 'SIPELA Laundry Express',
      ownerName: 'Hendra Wijaya',
      phone: '08119876543',
      email: 'owner@sipela.id',
      planType: 'pro',
      status: 'active',
      weightTolerancePercent: new Prisma.Decimal(10.0),
    },
  });

  console.log(`✅ Tenant siap: ${tenant.name} (ID: ${tenant.id})`);

  // 2. Buat Cabang (Branch)
  const branchTebet = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'SIPELA Express — Cabang Tebet',
      location: 'Jl. Tebet Raya No. 45, Jakarta Selatan',
      email: 'tebet@sipela.id',
      phone: '02183701234',
      long: new Prisma.Decimal(106.853),
      lat: new Prisma.Decimal(-6.226),
      isMainBranch: true,
    },
  });

  const branchSudirman = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'SIPELA Express — Cabang Sudirman',
      location: 'Jl. Jend. Sudirman Kav. 21, Jakarta Pusat',
      email: 'sudirman@sipela.id',
      phone: '0215701234',
      long: new Prisma.Decimal(106.822),
      lat: new Prisma.Decimal(-6.208),
      isMainBranch: false,
    },
  });

  console.log(
    `✅ 2 Cabang siap: ${branchTebet.name} & ${branchSudirman.name}`,
  );

  // 3. Buat Pegawai (Employee)
  const employeesData = [
    {
      fullName: 'Hendra Wijaya',
      email: 'owner@sipela.id',
      role: 'owner',
      branchId: branchTebet.id,
    },
    {
      fullName: 'Siti Rahmawati',
      email: 'admin@sipela.id',
      role: 'admin',
      branchId: branchTebet.id,
    },
    {
      fullName: 'Rina Marlina',
      email: 'kasir@sipela.id',
      role: 'kasir',
      branchId: branchTebet.id,
    },
    {
      fullName: 'Doni Pratama',
      email: 'operator@sipela.id',
      role: 'operator',
      branchId: branchTebet.id,
    },
    {
      fullName: 'Budi Santoso (Kurir)',
      email: 'kurir@sipela.id',
      role: 'staff',
      branchId: branchTebet.id,
    },
  ];

  const createdEmployees: Record<string, any> = {};

  for (const emp of employeesData) {
    const created = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        password: passwordHash,
      },
      create: {
        tenantId: tenant.id,
        branchId: emp.branchId,
        fullName: emp.fullName,
        email: emp.email,
        password: passwordHash,
        role: emp.role,
        status: 'active',
      },
    });
    createdEmployees[emp.role] = created;
  }

  console.log('✅ 5 Akun Pegawai (Password: password123) siap:');
  console.log('   - Owner:    owner@sipela.id');
  console.log('   - Admin:    admin@sipela.id');
  console.log('   - Kasir:    kasir@sipela.id');
  console.log('   - Operator: operator@sipela.id');
  console.log('   - Kurir:    kurir@sipela.id');

  // 4. Buat Profil Kurir
  const courierEmployee = createdEmployees['staff'];
  const courier = await prisma.courier.create({
    data: {
      tenantId: tenant.id,
      branchId: branchTebet.id,
      employeeId: courierEmployee.id,
      name: 'Budi Santoso (Kurir)',
      phone: '081299887766',
      vehicleType: 'motor',
      plateNumber: 'B 1234 ABC',
      status: 'active',
    },
  });

  console.log(`✅ Profil Kurir siap: ${courier.name} (Plat: ${courier.plateNumber})`);

  // 5. Buat Customer & Alamat
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      branchId: branchTebet.id,
      name: 'Ahmad Fauzi',
      phone: '08123456789',
    },
  });

  const addressHome = await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      location: 'Jl. Tebet Barat Dalam No. 12, Jakarta Selatan',
      label: 'Rumah',
      note: 'Pagar hitam, bel di samping kanan',
      long: new Prisma.Decimal(106.85),
      lat: new Prisma.Decimal(-6.228),
      isDefault: true,
    },
  });

  const addressOffice = await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      location: 'Gedung Menara Sudirman Lt. 8, Jakarta Pusat',
      label: 'Kantor',
      note: 'Titip di resepsionis lobi',
      long: new Prisma.Decimal(106.821),
      lat: new Prisma.Decimal(-6.21),
      isDefault: false,
    },
  });

  console.log(`✅ Customer siap: ${customer.name} (Alamat: Rumah & Kantor)`);

  // 6. Katalog Layanan (Service)
  const services = [
    {
      name: 'Cuci Komplit (Cuci + Kering + Setrika)',
      price: new Prisma.Decimal(8000),
    },
    {
      name: 'Cuci Kering Lipat',
      price: new Prisma.Decimal(6000),
    },
    {
      name: 'Setrika Saja',
      price: new Prisma.Decimal(5000),
    },
    {
      name: 'Cuci Bed Cover Besar',
      price: new Prisma.Decimal(25000),
    },
    {
      name: 'Cuci Sepatu Premium',
      price: new Prisma.Decimal(35000),
    },
  ];

  for (const s of services) {
    await prisma.service.create({
      data: {
        tenantId: tenant.id,
        branchId: branchTebet.id,
        name: s.name,
        price: s.price,
        isActive: true,
      },
    });
  }

  console.log('✅ Katalog 5 Layanan Laundry siap.');

  // 7. Aturan Ongkos Kirim (TenantCourierRules)
  await prisma.tenantCourierRules.create({
    data: {
      tenantId: tenant.id,
      branchId: branchTebet.id,
      pricingType: 'both',
      flatFee: new Prisma.Decimal(10000),
      pickupFee: new Prisma.Decimal(5000),
      deliveryFee: new Prisma.Decimal(5000),
      bothFee: new Prisma.Decimal(10000),
    },
  });

  console.log('✅ Aturan Ongkos Kirim (Flat Rp 10.000) siap.');

  // 8. Diskon & Membership
  await prisma.discount.create({
    data: {
      tenantId: tenant.id,
      branchId: branchTebet.id,
      name: 'Promo Grand Opening 10%',
      typeDiscount: 'percent',
      percent: new Prisma.Decimal(10.0),
      isActive: true,
    },
  });

  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);

  await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      branchId: branchTebet.id,
      customerId: customer.id,
      name: 'SIPELA Gold Membership',
      type: 'gold',
      percent: new Prisma.Decimal(15.0),
      startDate: now,
      expiredDate: nextYear,
      price: new Prisma.Decimal(150000),
      isActive: true,
    },
  });

  console.log('✅ Promo Diskon 10% & Membership Gold 15% siap.');
  console.log('🎉 Seeding database SIPELA berhasil 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
