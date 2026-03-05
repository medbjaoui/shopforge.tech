-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'EXCHANGE_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXCHANGED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "exchangeReason" TEXT,
ADD COLUMN     "exchangeRequestedAt" TIMESTAMP(3),
ADD COLUMN     "exchangedAt" TIMESTAMP(3);
