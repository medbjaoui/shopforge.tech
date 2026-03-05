-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "matriculeFiscal" TEXT,
ADD COLUMN     "rne" TEXT;

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "totalHT" DECIMAL(10,3) NOT NULL,
    "totalTVA" DECIMAL(10,3) NOT NULL,
    "totalTTC" DECIMAL(10,2) NOT NULL,
    "timbreFiscal" DECIMAL(10,3) NOT NULL DEFAULT 0.600,
    "shippingFeeHT" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "shippingFeeTVA" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalTotal" DECIMAL(10,2) NOT NULL,
    "tvaRate" DECIMAL(5,4) NOT NULL DEFAULT 0.19,
    "sellerName" TEXT NOT NULL,
    "sellerAddress" TEXT,
    "sellerPhone" TEXT,
    "sellerEmail" TEXT,
    "sellerMF" TEXT NOT NULL,
    "sellerRNE" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "buyerAddress" JSONB,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceHT" DECIMAL(10,3) NOT NULL,
    "unitPriceTTC" DECIMAL(10,2) NOT NULL,
    "totalHT" DECIMAL(10,3) NOT NULL,
    "totalTVA" DECIMAL(10,3) NOT NULL,
    "totalTTC" DECIMAL(10,2) NOT NULL,
    "tvaRate" DECIMAL(5,4) NOT NULL DEFAULT 0.19,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_issuedAt_idx" ON "invoices"("issuedAt");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
