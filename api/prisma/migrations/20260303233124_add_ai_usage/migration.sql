-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('PRODUCT_DESCRIPTION', 'STORE_CHATBOT', 'REVIEW_SENTIMENT', 'DASHBOARD_INSIGHTS', 'ORDER_RESPONSE');

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_tenantId_idx" ON "ai_usage"("tenantId");

-- CreateIndex
CREATE INDEX "ai_usage_tenantId_createdAt_idx" ON "ai_usage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
