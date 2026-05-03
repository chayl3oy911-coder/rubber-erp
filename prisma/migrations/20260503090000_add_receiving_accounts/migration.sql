-- Step 10 — Receiving Account / Company Payment Setup
--
-- Adds two master-data tables (ReceivingEntity, ReceivingBankAccount) plus
-- nullable FK + 6 snapshot columns on SalesOrder. Pre-existing SalesOrder
-- rows keep NULL for receiving info (no backfill — historical bills are
-- intentionally left untouched and the UI renders "—").
--
-- Two PARTIAL UNIQUE INDEXES are written by hand because Prisma's
-- @@unique cannot express a partial predicate:
--   1. one-active-default per (branchId-scope) on ReceivingEntity
--   2. one-active-primary per (receivingEntityId) on ReceivingBankAccount
-- For (1) we collapse NULL → a sentinel string so NULL and uuid scopes are
-- both indexable and never collide with each other.

-- CreateTable
CREATE TABLE "ReceivingEntity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branchId" UUID,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingBankAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receivingEntityId" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingBankAccount_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add 8 columns to SalesOrder (all nullable for backfill safety)
ALTER TABLE "SalesOrder"
    ADD COLUMN "receivingEntityId" UUID,
    ADD COLUMN "receivingBankAccountId" UUID,
    ADD COLUMN "receivingEntityNameSnapshot" TEXT,
    ADD COLUMN "receivingEntityTypeSnapshot" TEXT,
    ADD COLUMN "receivingTaxIdSnapshot" TEXT,
    ADD COLUMN "receivingBankNameSnapshot" TEXT,
    ADD COLUMN "receivingBankAccountNoSnapshot" TEXT,
    ADD COLUMN "receivingBankAccountNameSnapshot" TEXT;

-- CreateIndex
CREATE INDEX "ReceivingEntity_branchId_idx" ON "ReceivingEntity"("branchId");

-- CreateIndex
CREATE INDEX "ReceivingEntity_isActive_idx" ON "ReceivingEntity"("isActive");

-- CreateIndex
CREATE INDEX "ReceivingEntity_isDefault_idx" ON "ReceivingEntity"("isDefault");

-- CreateIndex
CREATE INDEX "ReceivingEntity_branchId_isActive_idx" ON "ReceivingEntity"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "ReceivingBankAccount_receivingEntityId_idx" ON "ReceivingBankAccount"("receivingEntityId");

-- CreateIndex
CREATE INDEX "ReceivingBankAccount_receivingEntityId_isActive_idx" ON "ReceivingBankAccount"("receivingEntityId", "isActive");

-- CreateIndex
CREATE INDEX "ReceivingBankAccount_bankName_bankAccountNo_idx" ON "ReceivingBankAccount"("bankName", "bankAccountNo");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingBankAccount_receivingEntityId_bankName_bankAccountNo_key" ON "ReceivingBankAccount"("receivingEntityId", "bankName", "bankAccountNo");

-- CreateIndex
CREATE INDEX "SalesOrder_receivingEntityId_idx" ON "SalesOrder"("receivingEntityId");

-- CreateIndex
CREATE INDEX "SalesOrder_receivingBankAccountId_idx" ON "SalesOrder"("receivingBankAccountId");

-- AddForeignKey
ALTER TABLE "ReceivingEntity" ADD CONSTRAINT "ReceivingEntity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingEntity" ADD CONSTRAINT "ReceivingEntity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingBankAccount" ADD CONSTRAINT "ReceivingBankAccount_receivingEntityId_fkey" FOREIGN KEY ("receivingEntityId") REFERENCES "ReceivingEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_receivingEntityId_fkey" FOREIGN KEY ("receivingEntityId") REFERENCES "ReceivingEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_receivingBankAccountId_fkey" FOREIGN KEY ("receivingBankAccountId") REFERENCES "ReceivingBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Partial unique indexes (raw — Prisma cannot express WHERE clauses) ─────
--
-- (1) At most ONE active default ReceivingEntity per scope, where a "scope"
--     is one of {NULL (company-wide), branchId-uuid}. NULL maps to the
--     sentinel string '__null__' so the two scope universes never collide.
CREATE UNIQUE INDEX "ReceivingEntity_one_default_per_scope"
    ON "ReceivingEntity" ((COALESCE("branchId"::text, '__null__')))
    WHERE "isDefault" = TRUE AND "isActive" = TRUE;

-- (2) At most ONE active primary ReceivingBankAccount per entity. Service
--     code maintains the invariant inside transactions; this index is the
--     last-line defence against races / direct DB edits.
CREATE UNIQUE INDEX "ReceivingBankAccount_one_primary_per_entity"
    ON "ReceivingBankAccount" ("receivingEntityId")
    WHERE "isPrimary" = TRUE AND "isActive" = TRUE;
