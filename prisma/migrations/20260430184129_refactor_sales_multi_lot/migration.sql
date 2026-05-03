/*
  Warnings:

  - You are about to drop the column `drcWeight` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the column `grossWeight` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the column `rubberType` on the `SalesOrder` table. All the data in the column will be lost.
  - You are about to drop the column `stockLotId` on the `SalesOrder` table. All the data in the column will be lost.
  - Added the required column `drcWeightTotal` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grossWeightTotal` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_stockLotId_fkey";

-- DropIndex
DROP INDEX "SalesOrder_stockLotId_idx";

-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "drcWeight",
DROP COLUMN "grossWeight",
DROP COLUMN "rubberType",
DROP COLUMN "stockLotId",
ADD COLUMN     "drcWeightTotal" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "grossWeightTotal" DECIMAL(12,2) NOT NULL;

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salesOrderId" UUID NOT NULL,
    "stockLotId" UUID NOT NULL,
    "rubberType" TEXT NOT NULL,
    "grossWeight" DECIMAL(12,2) NOT NULL,
    "costPerKgSnapshot" DECIMAL(14,4) NOT NULL,
    "costAmount" DECIMAL(14,2) NOT NULL,
    "movementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderLine_movementId_key" ON "SalesOrderLine"("movementId");

-- CreateIndex
CREATE INDEX "SalesOrderLine_salesOrderId_idx" ON "SalesOrderLine"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderLine_stockLotId_idx" ON "SalesOrderLine"("stockLotId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderLine_salesOrderId_stockLotId_key" ON "SalesOrderLine"("salesOrderId", "stockLotId");

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
