-- Step 11: Stock Intake & Purchase Lifecycle
--
-- Adds the `stockIntakeStatus` axis (separate from the purchase lifecycle
-- `status`) plus a forward-compat `paymentStatus` column. New columns are
-- NOT NULL with safe defaults so existing rows stay valid; an explicit
-- backfill step (#2) corrects already-received tickets to RECEIVED so the
-- post-deploy "PENDING list" doesn't surface tickets that have stock lots
-- already.
--
-- Hand-written so the backfill UPDATE happens inside the same migration
-- (Prisma's auto-generated diff would not include it).

-- ─── 1. Add new columns ────────────────────────────────────────────────────
ALTER TABLE "PurchaseTicket"
  ADD COLUMN "stockIntakeStatus"      TEXT       NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "stockIntakeReceivedAt"  TIMESTAMP(3),
  ADD COLUMN "stockIntakeSkippedAt"   TIMESTAMP(3),
  ADD COLUMN "stockIntakeSkippedById" UUID,
  ADD COLUMN "stockIntakeSkipReason"  TEXT,
  ADD COLUMN "paymentStatus"          TEXT       NOT NULL DEFAULT 'UNPAID';

-- ─── 2. Backfill: tickets that already have a StockLot are RECEIVED ────────
-- This is NOT mutating business state — `stockIntakeStatus` is a brand-new
-- column whose correct historical value is derivable from the existing
-- `StockLot` row. Marking them RECEIVED prevents already-received tickets
-- from re-appearing in the new /stock/from-purchase intake list (which
-- filters on `stockIntakeStatus = 'PENDING'`) and would otherwise produce
-- confusing "lot already exists" errors when an operator clicks "create".
UPDATE "PurchaseTicket" pt
SET    "stockIntakeStatus"     = 'RECEIVED',
       "stockIntakeReceivedAt" = sl."createdAt"
FROM   "StockLot" sl
WHERE  sl."sourcePurchaseTicketId" = pt."id";

-- ─── 3. Foreign key for stockIntakeSkippedById ─────────────────────────────
ALTER TABLE "PurchaseTicket"
  ADD CONSTRAINT "PurchaseTicket_stockIntakeSkippedById_fkey"
  FOREIGN KEY ("stockIntakeSkippedById") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. Indexes for the new query patterns ─────────────────────────────────
-- The list endpoint always filters by branch + intake status; payment is
-- forward-compat but the index is cheap and avoids a future ALTER on a hot
-- table.
CREATE INDEX "PurchaseTicket_branchId_stockIntakeStatus_idx"
  ON "PurchaseTicket"("branchId", "stockIntakeStatus");

CREATE INDEX "PurchaseTicket_branchId_paymentStatus_idx"
  ON "PurchaseTicket"("branchId", "paymentStatus");
