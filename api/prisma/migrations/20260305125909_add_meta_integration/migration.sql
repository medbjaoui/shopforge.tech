-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaPixelId" TEXT,
ADD COLUMN     "whatsappWidgetEnabled" BOOLEAN NOT NULL DEFAULT false;
