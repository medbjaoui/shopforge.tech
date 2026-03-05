-- AlterTable: add storeLanguage, referralCode, referredById to tenants
ALTER TABLE "tenants"
  ADD COLUMN "storeLanguage" TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN "referralCode"  TEXT,
  ADD COLUMN "referredById"  TEXT;

-- CreateIndex: unique referral code
CREATE UNIQUE INDEX "tenants_referralCode_key" ON "tenants"("referralCode");

-- AddForeignKey: referredBy self-relation
ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "tenants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum: ReferralRewardStatus
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable: referral_rewards
CREATE TABLE "referral_rewards" (
  "id"         TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredId" TEXT NOT NULL,
  "amount"     DECIMAL(10,2) NOT NULL,
  "status"     "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique per referred tenant
CREATE UNIQUE INDEX "referral_rewards_referredId_key" ON "referral_rewards"("referredId");

-- CreateIndex: index on referrerId
CREATE INDEX "referral_rewards_referrerId_idx" ON "referral_rewards"("referrerId");

-- AddForeignKey: referrer
ALTER TABLE "referral_rewards"
  ADD CONSTRAINT "referral_rewards_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: referred
ALTER TABLE "referral_rewards"
  ADD CONSTRAINT "referral_rewards_referredId_fkey"
  FOREIGN KEY ("referredId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
