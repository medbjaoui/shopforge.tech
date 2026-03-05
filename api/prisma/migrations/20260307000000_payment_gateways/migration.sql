-- Migration: Payment Gateways (ClicToPay + Floussi)

-- 1. New PaymentMethod enum values
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CLICK_TO_PAY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'FLOUSSI';

-- 2. New PaymentStatus enum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Add payment status fields to orders
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;

-- 4. COD orders already paid on delivery — keep PENDING (logical)

-- 5. Add gateway toggles to tenants
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "clickToPayEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "floussiEnabled"    BOOLEAN NOT NULL DEFAULT false;
