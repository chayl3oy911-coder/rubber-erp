/*
  Warnings:

  - You are about to alter the column `pricePerKg` on the `PurchaseTicket` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,4)` to `Decimal(12,2)`.
  - You are about to alter the column `pricePerKg` on the `SalesOrder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,4)` to `Decimal(14,2)`.
  - You are about to alter the column `costPerKgSnapshot` on the `SalesOrderLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,4)` to `Decimal(14,2)`.
  - You are about to alter the column `effectiveCostPerKg` on the `StockLot` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,4)` to `Decimal(14,2)`.

*/
-- AlterTable
ALTER TABLE "PurchaseTicket" ALTER COLUMN "pricePerKg" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SalesOrder" ALTER COLUMN "pricePerKg" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "SalesOrderLine" ALTER COLUMN "costPerKgSnapshot" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "StockLot" ALTER COLUMN "effectiveCostPerKg" SET DATA TYPE DECIMAL(14,2);
