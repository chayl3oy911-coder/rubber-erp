-- CreateTable
CREATE TABLE "StockLot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL,
    "sourcePurchaseTicketId" UUID NOT NULL,
    "lotNo" TEXT NOT NULL,
    "rubberType" TEXT NOT NULL,
    "initialWeight" DECIMAL(12,2) NOT NULL,
    "remainingWeight" DECIMAL(12,2) NOT NULL,
    "costAmount" DECIMAL(14,2) NOT NULL,
    "effectiveCostPerKg" DECIMAL(14,4) NOT NULL,
    "status" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL,
    "stockLotId" UUID NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "beforeWeight" DECIMAL(12,2) NOT NULL,
    "afterWeight" DECIMAL(12,2) NOT NULL,
    "reasonType" TEXT,
    "referenceType" TEXT,
    "referenceId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLot_branchId_idx" ON "StockLot"("branchId");

-- CreateIndex
CREATE INDEX "StockLot_branchId_status_idx" ON "StockLot"("branchId", "status");

-- CreateIndex
CREATE INDEX "StockLot_branchId_rubberType_idx" ON "StockLot"("branchId", "rubberType");

-- CreateIndex
CREATE INDEX "StockLot_branchId_createdAt_idx" ON "StockLot"("branchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_branchId_lotNo_key" ON "StockLot"("branchId", "lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_sourcePurchaseTicketId_key" ON "StockLot"("sourcePurchaseTicketId");

-- CreateIndex
CREATE INDEX "StockMovement_stockLotId_createdAt_idx" ON "StockMovement"("stockLotId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_branchId_movementType_idx" ON "StockMovement"("branchId", "movementType");

-- CreateIndex
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_sourcePurchaseTicketId_fkey" FOREIGN KEY ("sourcePurchaseTicketId") REFERENCES "PurchaseTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
