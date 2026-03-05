-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "firstOrderAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "acquisitionSource" TEXT,
ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "churnedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorId" TEXT,
    "customerId" TEXT,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "page" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "deviceType" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_funnels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "productViews" INTEGER NOT NULL DEFAULT 0,
    "addToCarts" INTEGER NOT NULL DEFAULT 0,
    "checkoutStarts" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "daily_funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_metrics_daily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "logins" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "ordersReceived" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "productsCreated" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tenant_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_tenantId_event_createdAt_idx" ON "analytics_events"("tenantId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_tenantId_createdAt_idx" ON "analytics_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_tenantId_visitorId_createdAt_idx" ON "analytics_events"("tenantId", "visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");

-- CreateIndex
CREATE INDEX "daily_funnels_tenantId_date_idx" ON "daily_funnels"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_funnels_tenantId_date_key" ON "daily_funnels"("tenantId", "date");

-- CreateIndex
CREATE INDEX "tenant_metrics_daily_tenantId_date_idx" ON "tenant_metrics_daily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_metrics_daily_tenantId_date_key" ON "tenant_metrics_daily"("tenantId", "date");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_funnels" ADD CONSTRAINT "daily_funnels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_metrics_daily" ADD CONSTRAINT "tenant_metrics_daily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
