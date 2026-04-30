/*
  Warnings:

  - You are about to alter the column `grossWeight` on the `PurchaseTicket` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Decimal(12,2)`.
  - You are about to alter the column `tareWeight` on the `PurchaseTicket` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Decimal(12,2)`.
  - You are about to alter the column `netWeight` on the `PurchaseTicket` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "PurchaseTicket" ADD COLUMN     "netPayableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingTaxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ALTER COLUMN "grossWeight" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tareWeight" SET DEFAULT 0,
ALTER COLUMN "tareWeight" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "netWeight" SET DATA TYPE DECIMAL(12,2);
