-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "announcementBgColor" TEXT,
ADD COLUMN     "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcementText" TEXT,
ADD COLUMN     "announcementTextColor" TEXT,
ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "favicon" TEXT,
ADD COLUMN     "font" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "heroCta" TEXT,
ADD COLUMN     "heroSubtitle" TEXT,
ADD COLUMN     "heroTitle" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "tiktok" TEXT;
