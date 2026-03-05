-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('TOPUP', 'COMMISSION', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('COLLECTED', 'REFUNDED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "tenant_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "totalTopup" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minimumBalance" DECIMAL(10,3) NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "balanceBefore" DECIMAL(10,3) NOT NULL,
    "balanceAfter" DECIMAL(10,3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "commissionAmount" DECIMAL(10,3) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_wallets_tenantId_key" ON "tenant_wallets"("tenantId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "commission_records_orderId_key" ON "commission_records"("orderId");

-- CreateIndex
CREATE INDEX "commission_records_tenantId_idx" ON "commission_records"("tenantId");

-- CreateIndex
CREATE INDEX "commission_records_tenantId_createdAt_idx" ON "commission_records"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_tenantId_email_idx" ON "customers"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "tenant_wallets" ADD CONSTRAINT "tenant_wallets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "tenant_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "tenant_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
