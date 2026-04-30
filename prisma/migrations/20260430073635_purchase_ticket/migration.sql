-- CreateTable
CREATE TABLE "PurchaseTicket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL,
    "farmerId" UUID NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "rubberType" TEXT NOT NULL,
    "grossWeight" DECIMAL(12,3) NOT NULL,
    "tareWeight" DECIMAL(12,3) NOT NULL,
    "netWeight" DECIMAL(12,3) NOT NULL,
    "pricePerKg" DECIMAL(12,4) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "cancelReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,

    CONSTRAINT "PurchaseTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseTicket_branchId_status_idx" ON "PurchaseTicket"("branchId", "status");

-- CreateIndex
CREATE INDEX "PurchaseTicket_branchId_createdAt_idx" ON "PurchaseTicket"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseTicket_farmerId_idx" ON "PurchaseTicket"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseTicket_branchId_ticketNo_key" ON "PurchaseTicket"("branchId", "ticketNo");

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
