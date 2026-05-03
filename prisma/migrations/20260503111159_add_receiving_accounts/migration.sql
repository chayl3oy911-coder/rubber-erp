-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_receivingBankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_receivingEntityId_fkey";

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_receivingEntityId_fkey" FOREIGN KEY ("receivingEntityId") REFERENCES "ReceivingEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_receivingBankAccountId_fkey" FOREIGN KEY ("receivingBankAccountId") REFERENCES "ReceivingBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ReceivingBankAccount_receivingEntityId_bankName_bankAccountNo_k" RENAME TO "ReceivingBankAccount_receivingEntityId_bankName_bankAccount_key";
