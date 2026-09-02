-- =====================================================================
-- SIPELA LAUNDRY — FULL VPS DATABASE SETUP SCRIPT
-- Berisi: 14 Tabel, Relasi, CHECK Constraints, dan Data Seeder
-- =====================================================================

-- 1. DROP EXISTING TABLES IF ANY
DROP TABLE IF EXISTS "courier_location_log" CASCADE;
DROP TABLE IF EXISTS "payment" CASCADE;
DROP TABLE IF EXISTS "order_status_log" CASCADE;
DROP TABLE IF EXISTS "order_item" CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS "tenant_courier_rules" CASCADE;
DROP TABLE IF EXISTS "service" CASCADE;
DROP TABLE IF EXISTS "discount" CASCADE;
DROP TABLE IF EXISTS "membership" CASCADE;
DROP TABLE IF EXISTS "customer_address" CASCADE;
DROP TABLE IF EXISTS "customer" CASCADE;
DROP TABLE IF EXISTS "courier" CASCADE;
DROP TABLE IF EXISTS "employee" CASCADE;
DROP TABLE IF EXISTS "branch" CASCADE;
DROP TABLE IF EXISTS "tenant" CASCADE;

-- 2. CREATE TABLE TENANT
CREATE TABLE "tenant" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "owner_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "plan_type" VARCHAR(30) NOT NULL DEFAULT 'basic',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "weight_tolerance_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_email_key" UNIQUE ("email")
);

-- 3. CREATE TABLE BRANCH
CREATE TABLE "branch" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "location" VARCHAR(255),
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "long" DECIMAL(9,6),
    "lat" DECIMAL(9,6),
    "is_main_branch" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "branch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "branch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_branch_tenant" ON "branch"("tenant_id");

-- 4. CREATE TABLE EMPLOYEE
CREATE TABLE "employee" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "password" VARCHAR(255) NOT NULL,
    "photo" VARCHAR(255),
    "role" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "employee_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "employee_email_key" UNIQUE ("email"),
    CONSTRAINT "employee_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "employee_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_employee_tenant_branch" ON "employee"("tenant_id", "branch_id");

-- 5. CREATE TABLE COURIER
CREATE TABLE "courier" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT,
    "employee_id" BIGINT,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "vehicle_type" VARCHAR(30),
    "plate_number" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "courier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "courier_employee_id_key" UNIQUE ("employee_id"),
    CONSTRAINT "courier_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "courier_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "courier_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_courier_tenant_branch" ON "courier"("tenant_id", "branch_id");

-- 6. CREATE TABLE CUSTOMER
CREATE TABLE "customer" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "customer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "customer_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_customer_tenant_branch" ON "customer"("tenant_id", "branch_id");

-- 7. CREATE TABLE CUSTOMER_ADDRESS
CREATE TABLE "customer_address" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "label" VARCHAR(50),
    "note" VARCHAR(255),
    "long" DECIMAL(9,6),
    "lat" DECIMAL(9,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_address_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_address_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_customer_address_customer" ON "customer_address"("customer_id");

-- 8. CREATE TABLE MEMBERSHIP
CREATE TABLE "membership" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "percent" DECIMAL(5,2),
    "start_date" DATE NOT NULL,
    "expired_date" DATE NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "membership_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "membership_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_membership_customer" ON "membership"("customer_id");
CREATE INDEX "idx_membership_tenant_branch" ON "membership"("tenant_id", "branch_id");

-- 9. CREATE TABLE DISCOUNT
CREATE TABLE "discount" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "type_discount" VARCHAR(30) NOT NULL,
    "price" DECIMAL(14,2),
    "percent" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "discount_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "discount_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_discount_tenant_branch" ON "discount"("tenant_id", "branch_id");

-- 10. CREATE TABLE SERVICE
CREATE TABLE "service" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_service_tenant_branch" ON "service"("tenant_id", "branch_id");

-- 11. CREATE TABLE TENANT_COURIER_RULES
CREATE TABLE "tenant_courier_rules" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "pricing_type" VARCHAR(20) NOT NULL,
    "flat_fee" DECIMAL(14,2) DEFAULT 0,
    "pickup_fee" DECIMAL(14,2) DEFAULT 0,
    "delivery_fee" DECIMAL(14,2) DEFAULT 0,
    "both_fee" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_courier_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_courier_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_courier_rules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_courier_rules_tenant_branch" ON "tenant_courier_rules"("tenant_id", "branch_id");

-- 12. CREATE TABLE ORDER
CREATE TABLE "order" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "courier_id" BIGINT,
    "pickup_address_id" BIGINT,
    "delivery_address_id" BIGINT,
    "discount_id" BIGINT,
    "membership_id" BIGINT,
    "distance" DECIMAL(8,2),
    "courier_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimated_weight" DECIMAL(8,2),
    "actual_weight" DECIMAL(8,2),
    "weight_status" VARCHAR(20) NOT NULL DEFAULT 'not_required',
    "weight_confirmed_at" TIMESTAMP(3),
    "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_pickup_address_id_fkey" FOREIGN KEY ("pickup_address_id") REFERENCES "customer_address"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "customer_address"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_order_tenant_branch" ON "order"("tenant_id", "branch_id");
CREATE INDEX "idx_order_customer" ON "order"("customer_id");
CREATE INDEX "idx_order_courier" ON "order"("courier_id");
CREATE INDEX "idx_order_status" ON "order"("status");
CREATE INDEX "idx_order_weight_status" ON "order"("weight_status");

-- 13. CREATE TABLE ORDER_ITEM
CREATE TABLE "order_item" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "service_id" BIGINT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_item_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_order_item_order" ON "order_item"("order_id");
CREATE INDEX "idx_order_item_service" ON "order_item"("service_id");

-- 14. CREATE TABLE ORDER_STATUS_LOG
CREATE TABLE "order_status_log" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "changed_by" BIGINT,
    "note" VARCHAR(255),
    "photo_url" VARCHAR(255),
    "photo_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_status_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_status_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_order_status_log_order" ON "order_status_log"("order_id");
CREATE INDEX "idx_order_status_log_changed_by" ON "order_status_log"("changed_by");

-- 15. CREATE TABLE PAYMENT
CREATE TABLE "payment" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reference_no" VARCHAR(100),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_reference_no_key" UNIQUE ("reference_no"),
    CONSTRAINT "payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_payment_order" ON "payment"("order_id");

-- 16. CREATE TABLE COURIER_LOCATION_LOG
CREATE TABLE "courier_location_log" (
    "id" BIGSERIAL NOT NULL,
    "courier_id" BIGINT NOT NULL,
    "order_id" BIGINT,
    "long" DECIMAL(9,6) NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "courier_location_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "courier_location_log_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "courier_location_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_courier_location_courier" ON "courier_location_log"("courier_id", "created_at");

-- =====================================================================
-- 17. CHECK CONSTRAINTS POSTGRESQL
-- =====================================================================
ALTER TABLE "order" DROP CONSTRAINT IF EXISTS chk_weight_status;
ALTER TABLE "order" ADD CONSTRAINT chk_weight_status
  CHECK (weight_status IN ('not_required','pending','matched','mismatched','confirmed'));

ALTER TABLE "order" DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE "order" ADD CONSTRAINT chk_order_status
  CHECK (status IN ('pending','pickup','received','process','delivery','done','cancelled'));

ALTER TABLE "order" DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE "order" ADD CONSTRAINT chk_payment_status
  CHECK (payment_status IN ('unpaid','partial','paid','refunded'));

-- =====================================================================
-- 18. INITIAL SEED DATA (TENANT, CABANG, PEGAWAI, LAYANAN, DLL)
-- =====================================================================

-- Tenant
INSERT INTO "tenant" ("id", "name", "owner_name", "phone", "email", "plan_type", "status", "weight_tolerance_percent")
VALUES (1, 'SIPELA Laundry Express', 'Hendra Wijaya', '08119876543', 'owner@sipela.id', 'pro', 'active', 10.00)
ON CONFLICT ("id") DO NOTHING;

-- Cabang
INSERT INTO "branch" ("id", "tenant_id", "name", "location", "email", "phone", "long", "lat", "is_main_branch")
VALUES 
  (1, 1, 'SIPELA Express — Cabang Tebet', 'Jl. Tebet Raya No. 45, Jakarta Selatan', 'tebet@sipela.id', '02183701234', 106.853000, -6.226000, true),
  (2, 1, 'SIPELA Express — Cabang Sudirman', 'Jl. Jend. Sudirman Kav. 21, Jakarta Pusat', 'sudirman@sipela.id', '0215701234', 106.822000, -6.208000, false)
ON CONFLICT ("id") DO NOTHING;

-- Pegawai (Password: password123 -> $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW)
INSERT INTO "employee" ("id", "tenant_id", "branch_id", "full_name", "email", "password", "role", "status")
VALUES 
  (1, 1, 1, 'Hendra Wijaya (Owner)', 'owner@sipela.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'owner', 'active'),
  (2, 1, 1, 'Siti Rahmawati (Admin)', 'admin@sipela.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', 'active'),
  (3, 1, 1, 'Rina Marlina (Kasir)', 'kasir@sipela.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'kasir', 'active'),
  (4, 1, 1, 'Doni Pratama (Operator)', 'operator@sipela.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'operator', 'active'),
  (5, 1, 1, 'Budi Santoso (Kurir)', 'kurir@sipela.id', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'staff', 'active')
ON CONFLICT ("id") DO NOTHING;

-- Kurir
INSERT INTO "courier" ("id", "tenant_id", "branch_id", "employee_id", "name", "phone", "vehicle_type", "plate_number", "status")
VALUES (1, 1, 1, 5, 'Budi Santoso (Kurir)', '081299887766', 'motor', 'B 1234 ABC', 'active')
ON CONFLICT ("id") DO NOTHING;

-- Customer
INSERT INTO "customer" ("id", "tenant_id", "branch_id", "name", "phone")
VALUES (1, 1, 1, 'Ahmad Fauzi', '08123456789')
ON CONFLICT ("id") DO NOTHING;

-- Customer Address
INSERT INTO "customer_address" ("id", "customer_id", "location", "label", "note", "long", "lat", "is_default")
VALUES 
  (1, 1, 'Jl. Tebet Barat Dalam No. 12, Jakarta Selatan', 'Rumah', 'Pagar hitam bel samping', 106.850000, -6.228000, true),
  (2, 1, 'Gedung Menara Sudirman Lt. 8, Jakarta Pusat', 'Kantor', 'Titip di resepsionis lobi', 106.821000, -6.210000, false)
ON CONFLICT ("id") DO NOTHING;

-- Layanan (Services)
INSERT INTO "service" ("id", "tenant_id", "branch_id", "name", "price", "is_active")
VALUES 
  (1, 1, 1, 'Cuci Komplit (Cuci + Kering + Setrika)', 8000, true),
  (2, 1, 1, 'Cuci Kering Lipat', 6000, true),
  (3, 1, 1, 'Setrika Saja', 5000, true),
  (4, 1, 1, 'Cuci Bed Cover Besar', 25000, true),
  (5, 1, 1, 'Cuci Sepatu Premium', 35000, true)
ON CONFLICT ("id") DO NOTHING;

-- Aturan Ongkir (TenantCourierRules)
INSERT INTO "tenant_courier_rules" ("id", "tenant_id", "branch_id", "pricing_type", "flat_fee", "pickup_fee", "delivery_fee", "both_fee")
VALUES (1, 1, 1, 'both', 10000, 5000, 5000, 10000)
ON CONFLICT ("id") DO NOTHING;

-- Diskon
INSERT INTO "discount" ("id", "tenant_id", "branch_id", "name", "type_discount", "percent", "is_active")
VALUES (1, 1, 1, 'Promo Grand Opening 10%', 'percent', 10.00, true)
ON CONFLICT ("id") DO NOTHING;

-- Membership Gold
INSERT INTO "membership" ("id", "tenant_id", "branch_id", "customer_id", "name", "type", "percent", "start_date", "expired_date", "price", "is_active")
VALUES (1, 1, 1, 1, 'SIPELA Gold Membership', 'gold', 15.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 150000, true)
ON CONFLICT ("id") DO NOTHING;

-- Fix Sequences for BigSerial
SELECT setval('tenant_id_seq', (SELECT MAX(id) FROM "tenant"));
SELECT setval('branch_id_seq', (SELECT MAX(id) FROM "branch"));
SELECT setval('employee_id_seq', (SELECT MAX(id) FROM "employee"));
SELECT setval('courier_id_seq', (SELECT MAX(id) FROM "courier"));
SELECT setval('customer_id_seq', (SELECT MAX(id) FROM "customer"));
SELECT setval('customer_address_id_seq', (SELECT MAX(id) FROM "customer_address"));
SELECT setval('service_id_seq', (SELECT MAX(id) FROM "service"));
SELECT setval('tenant_courier_rules_id_seq', (SELECT MAX(id) FROM "tenant_courier_rules"));
SELECT setval('discount_id_seq', (SELECT MAX(id) FROM "discount"));
SELECT setval('membership_id_seq', (SELECT MAX(id) FROM "membership"));
