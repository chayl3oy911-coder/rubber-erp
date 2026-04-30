/*
  Warnings:

  - You are about to drop the column `farmerId` on the `PurchaseTicket` table. All the data in the column will be lost.
  - You are about to drop the `Farmer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `customerId` to the `PurchaseTicket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Farmer" DROP CONSTRAINT "Farmer_branchId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseTicket" DROP CONSTRAINT "PurchaseTicket_farmerId_fkey";

-- DropIndex
DROP INDEX "PurchaseTicket_farmerId_idx";

-- AlterTable
ALTER TABLE "PurchaseTicket" DROP COLUMN "farmerId",
ADD COLUMN     "customerId" UUID NOT NULL;

-- DropTable
DROP TABLE "Farmer";

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "nationalId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBankAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "accountName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_branchId_code_key" ON "Customer"("branchId", "code");

-- CreateIndex
CREATE INDEX "CustomerBankAccount_customerId_idx" ON "CustomerBankAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBankAccount_bankName_bankAccountNo_key" ON "CustomerBankAccount"("bankName", "bankAccountNo");

-- CreateIndex
CREATE INDEX "PurchaseTicket_customerId_idx" ON "PurchaseTicket"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "CustomerBankAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseTicket" ADD CONSTRAINT "PurchaseTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
