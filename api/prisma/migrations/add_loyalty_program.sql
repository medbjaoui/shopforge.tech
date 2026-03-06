-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "LoyaltyActionType" AS ENUM ('EARNED_PURCHASE', 'EARNED_WELCOME', 'EARNED_REVIEW', 'EARNED_REFERRAL', 'REDEEMED_DISCOUNT', 'EXPIRED', 'ADJUSTED');

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pointsPerDinar" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "rewardThreshold" INTEGER NOT NULL DEFAULT 100,
    "rewardValue" DECIMAL(10,2) NOT NULL DEFAULT 10.0,
    "welcomePoints" INTEGER NOT NULL DEFAULT 0,
    "reviewPoints" INTEGER NOT NULL DEFAULT 10,
    "silverThreshold" DECIMAL(10,2) NOT NULL DEFAULT 200.0,
    "goldThreshold" DECIMAL(10,2) NOT NULL DEFAULT 500.0,
    "platinumThreshold" DECIMAL(10,2) NOT NULL DEFAULT 1000.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "type" "LoyaltyActionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "orderId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_tenantId_key" ON "loyalty_programs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_customerId_key" ON "customer_loyalty"("customerId");

-- CreateIndex
CREATE INDEX "customer_loyalty_programId_idx" ON "customer_loyalty"("programId");

-- CreateIndex
CREATE INDEX "loyalty_history_customerId_idx" ON "loyalty_history"("customerId");

-- CreateIndex
CREATE INDEX "loyalty_history_programId_idx" ON "loyalty_history"("programId");

-- CreateIndex
CREATE INDEX "loyalty_history_orderId_idx" ON "loyalty_history"("orderId");

-- CreateIndex
CREATE INDEX "loyalty_history_createdAt_idx" ON "loyalty_history"("createdAt");

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_history" ADD CONSTRAINT "loyalty_history_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
