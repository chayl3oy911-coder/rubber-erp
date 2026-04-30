-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL,
    "stockLotId" UUID NOT NULL,
    "salesNo" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "saleType" TEXT NOT NULL,
    "rubberType" TEXT NOT NULL,
    "grossWeight" DECIMAL(12,2) NOT NULL,
    "drcPercent" DECIMAL(5,2) NOT NULL,
    "drcWeight" DECIMAL(12,2) NOT NULL,
    "pricePerKg" DECIMAL(14,4) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "withholdingTaxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "withholdingTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netReceivableAmount" DECIMAL(14,2) NOT NULL,
    "costAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "expectedReceiveDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" UUID,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "cancelReason" TEXT,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrder_branchId_idx" ON "SalesOrder"("branchId");

-- CreateIndex
CREATE INDEX "SalesOrder_branchId_status_idx" ON "SalesOrder"("branchId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_branchId_saleType_idx" ON "SalesOrder"("branchId", "saleType");

-- CreateIndex
CREATE INDEX "SalesOrder_branchId_createdAt_idx" ON "SalesOrder"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOrder_stockLotId_idx" ON "SalesOrder"("stockLotId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_branchId_salesNo_key" ON "SalesOrder"("branchId", "salesNo");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
