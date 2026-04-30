import "server-only";

import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { hasPermission } from "@/shared/auth/dal";
import { prisma } from "@/shared/lib/prisma";

import type {
  NotificationItem,
  NotificationKey,
  NotificationsSummary,
} from "./types";

/**
 * Lightweight notifications service.
 *
 * Design notes:
 * - Each rule is a single `count()` query (no row hydration). Rules the
 *   actor can't see are SKIPPED entirely — we never spend a query on a
 *   permission the user doesn't have.
 * - Branch scope is enforced at the SQL `where` clause (not in JS) so the
 *   DB can use the existing `branchId` indexes.
 * - Super Admin sees every branch; non-superadmins with no branches get
 *   zero counts without any query (early-return on empty scope).
 * - All queries run in parallel via `Promise.all`. With 3 rules this is
 *   ~3 ms in production-shaped data; if rule count grows we can revisit
 *   (e.g. union to one query) — premature for now.
 */

const RECENT_ADJUSTMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const HREF: Record<NotificationKey, string> = {
  "purchase.waiting_approval": "/purchases?status=WAITING_APPROVAL",
  "purchase.awaiting_stock_in": "/stock/from-purchase",
  "stock.recent_adjustments": "/stock",
};

/** Resolve `where.branchId` for branch-scoped queries. Returns `null` to
 * mean "skip this rule entirely" (caller short-circuits to count = 0). */
function branchScopeFilter(
  actor: AuthenticatedUser,
): { branchId: { in: string[] } } | undefined | null {
  if (actor.isSuperAdmin) return undefined; // no filter — see all branches
  if (actor.branchIds.length === 0) return null;
  return { branchId: { in: [...actor.branchIds] } };
}

async function countWaitingApproval(
  actor: AuthenticatedUser,
): Promise<number> {
  if (!hasPermission(actor, "purchase.approve")) return 0;
  const scope = branchScopeFilter(actor);
  if (scope === null) return 0;
  const where: Prisma.PurchaseTicketWhereInput = {
    status: "WAITING_APPROVAL",
    isActive: true,
    ...(scope ?? {}),
  };
  return prisma.purchaseTicket.count({ where });
}

async function countAwaitingStockIn(
  actor: AuthenticatedUser,
): Promise<number> {
  if (!hasPermission(actor, "stock.create")) return 0;
  const scope = branchScopeFilter(actor);
  if (scope === null) return 0;
  const where: Prisma.PurchaseTicketWhereInput = {
    status: "APPROVED",
    isActive: true,
    // 1:1 reverse relation — the ticket has no lot yet.
    stockLot: { is: null },
    ...(scope ?? {}),
  };
  return prisma.purchaseTicket.count({ where });
}

async function countRecentAdjustments(
  actor: AuthenticatedUser,
): Promise<number> {
  // Either permission can see the audit-style "recent adjustments" badge.
  // Adjusters care because they made the moves; auditors care because they
  // need to review them. Same count, same link.
  const canSee =
    hasPermission(actor, "stock.audit") ||
    hasPermission(actor, "stock.adjust");
  if (!canSee) return 0;
  const scope = branchScopeFilter(actor);
  if (scope === null) return 0;
  const since = new Date(Date.now() - RECENT_ADJUSTMENT_WINDOW_MS);
  const where: Prisma.StockMovementWhereInput = {
    movementType: { in: ["ADJUST_IN", "ADJUST_OUT"] },
    createdAt: { gte: since },
    ...(scope ?? {}),
  };
  return prisma.stockMovement.count({ where });
}

export async function getNotificationsSummary(
  actor: AuthenticatedUser,
): Promise<NotificationsSummary> {
  // Run the (already permission-gated) counts concurrently so the topbar
  // adds at most ~one DB round-trip to the layout's critical path.
  const [waitingApproval, awaitingStockIn, recentAdjustments] = await Promise.all([
    countWaitingApproval(actor),
    countAwaitingStockIn(actor),
    countRecentAdjustments(actor),
  ]);

  // Order matters — this is the visual order in the dropdown. Pick a
  // priority that mirrors business urgency: approvals → stock-in → audit.
  const candidates: ReadonlyArray<NotificationItem> = [
    {
      key: "purchase.waiting_approval",
      count: waitingApproval,
      href: HREF["purchase.waiting_approval"],
    },
    {
      key: "purchase.awaiting_stock_in",
      count: awaitingStockIn,
      href: HREF["purchase.awaiting_stock_in"],
    },
    {
      key: "stock.recent_adjustments",
      count: recentAdjustments,
      href: HREF["stock.recent_adjustments"],
    },
  ];

  const items = candidates.filter((c) => c.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return {
    total,
    items,
    hasAny: total > 0,
  };
}
