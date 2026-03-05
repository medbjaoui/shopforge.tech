-- CreateTable
CREATE TABLE "credit_code_usages" (
    "id" TEXT NOT NULL,
    "creditCodeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_code_usages_tenantId_idx" ON "credit_code_usages"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_code_usages_creditCodeId_tenantId_key" ON "credit_code_usages"("creditCodeId", "tenantId");

-- AddForeignKey
ALTER TABLE "credit_code_usages" ADD CONSTRAINT "credit_code_usages_creditCodeId_fkey" FOREIGN KEY ("creditCodeId") REFERENCES "credit_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_code_usages" ADD CONSTRAINT "credit_code_usages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing used codes to credit_code_usages
INSERT INTO "credit_code_usages" ("id", "creditCodeId", "tenantId", "amount", "usedAt")
SELECT
    gen_random_uuid()::text,
    cc."id",
    cc."usedBy",
    cc."amount",
    COALESCE(cc."usedAt", NOW())
FROM "credit_codes" cc
WHERE cc."usedBy" IS NOT NULL;

-- AlterTable: add new columns
ALTER TABLE "credit_codes"
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill usedCount for already-used codes
UPDATE "credit_codes" SET "usedCount" = 1 WHERE "usedBy" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "credit_codes" DROP CONSTRAINT IF EXISTS "credit_codes_usedBy_fkey";

-- Drop old columns
ALTER TABLE "credit_codes" DROP COLUMN "usedAt",
DROP COLUMN "usedBy";
