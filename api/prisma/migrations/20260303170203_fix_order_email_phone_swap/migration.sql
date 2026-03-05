/*
  Warnings:

  - Made the column `customerPhone` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "customerEmail" DROP NOT NULL,
ALTER COLUMN "customerPhone" SET NOT NULL;
