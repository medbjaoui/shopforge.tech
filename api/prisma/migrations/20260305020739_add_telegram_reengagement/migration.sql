-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "notificationChannel" TEXT DEFAULT 'EMAIL',
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkCode" TEXT,
ADD COLUMN     "telegramLinkExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
