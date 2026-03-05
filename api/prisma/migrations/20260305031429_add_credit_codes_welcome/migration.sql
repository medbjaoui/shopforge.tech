-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTxType" ADD VALUE 'WELCOME';
ALTER TYPE "WalletTxType" ADD VALUE 'REDEEM';

-- CreateTable
CREATE TABLE "credit_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_codes_code_key" ON "credit_codes"("code");

-- CreateIndex
CREATE INDEX "credit_codes_code_idx" ON "credit_codes"("code");

-- AddForeignKey
ALTER TABLE "credit_codes" ADD CONSTRAINT "credit_codes_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
