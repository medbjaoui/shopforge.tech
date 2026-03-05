-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bankTransferDetails" TEXT,
ADD COLUMN     "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false;
