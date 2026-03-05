-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "codEnabled" BOOLEAN NOT NULL DEFAULT true;
