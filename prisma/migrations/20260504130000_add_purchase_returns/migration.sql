-- Step 12: Purchase Return / Reverse-Stock Flow
--
-- Creates the `PurchaseReturn` table that records reverse-flow events for
-- StockLot rows that need to be (partially) returned to the supplier or
-- written off after intake. The reverse cost change runs through a new
-- `PURCHASE_RETURN_OUT` movement type — that's a TS-level constant only;
-- `StockMovement.movementType` is a `String` column with no DB enum, so no
-- ALTER TABLE is needed there.
--
-- No business-data backfill: there are no historical returns to migrate.
-- The table starts empty.

CREATE TABLE "PurchaseReturn" (
  "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
  "branchId"             UUID         NOT NULL,
  "purchaseTicketId"     UUID         NOT NULL,
  "stockLotId"           UUID         NOT NULL,

  "returnNo"             TEXT         NOT NULL,
  "status"               TEXT         NOT NULL DEFAULT 'DRAFT',

  "returnReasonType"     TEXT         NOT NULL,
  "returnReasonNote"     TEXT,

  "returnWeight"         DECIMAL(12, 2) NOT NULL,
  "returnCostAmount"     DECIMAL(14, 2) NOT NULL DEFAULT 0,

  "customerCodeSnapshot" TEXT,
  "customerNameSnapshot" TEXT,
  "ticketNoSnapshot"     TEXT,
  "lotNoSnapshot"        TEXT,

  "stockMovementId"      UUID,

  "refundStatus"         TEXT         NOT NULL DEFAULT 'PENDING',
  "refundedAmount"       DECIMAL(14, 2) NOT NULL DEFAULT 0,

  "createdById"          UUID         NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedById"        UUID,
  "confirmedAt"          TIMESTAMP(3),
  "cancelledById"        UUID,
  "cancelledAt"          TIMESTAMP(3),
  "cancelReason"         TEXT,

  "isActive"             BOOLEAN      NOT NULL DEFAULT true,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- Branch-scoped uniqueness — return numbers reset per branch, mirroring
-- ticketNo / lotNo conventions.
CREATE UNIQUE INDEX "PurchaseReturn_branchId_returnNo_key"
  ON "PurchaseReturn"("branchId", "returnNo");

-- Hard guarantee: a single StockMovement row can back at most one
-- PurchaseReturn (1:1 from the movement's side). This is what lets the
-- service safely roll back via P2002 detection if a confirm tries to
-- re-link an already-linked movement.
CREATE UNIQUE INDEX "PurchaseReturn_stockMovementId_key"
  ON "PurchaseReturn"("stockMovementId");

CREATE INDEX "PurchaseReturn_branchId_status_idx"
  ON "PurchaseReturn"("branchId", "status");

CREATE INDEX "PurchaseReturn_purchaseTicketId_idx"
  ON "PurchaseReturn"("purchaseTicketId");

CREATE INDEX "PurchaseReturn_stockLotId_idx"
  ON "PurchaseReturn"("stockLotId");

CREATE INDEX "PurchaseReturn_branchId_createdAt_idx"
  ON "PurchaseReturn"("branchId", "createdAt");

-- Foreign keys — RESTRICT on the upstream business rows because we never
-- want a delete cascade to silently erase return history. The user/actor
-- relations are SET NULL on delete because AppUser deactivation should
-- not cascade through the return record.
ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_purchaseTicketId_fkey"
  FOREIGN KEY ("purchaseTicketId") REFERENCES "PurchaseTicket"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_stockLotId_fkey"
  FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_stockMovementId_fkey"
  FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "AppUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
