import "server-only";

/**
 * Notification event hook — placeholder for Step 9.
 *
 * Today this is a deliberate no-op. When the Notification System lands
 * properly (Notification table + queue + UI feed) the implementation will
 * grow into "insert a row + maybe enqueue", but the call sites already
 * pass the right shape so no service-layer changes will be needed.
 *
 * IMPORTANT — invariants for callers:
 * 1. ALWAYS call this AFTER the database transaction commits. If it ever
 *    starts hitting external systems, we must not bind its outcome to the
 *    success of the source action.
 * 2. The function MUST swallow any internal error. Notification failures
 *    are never allowed to fail the source action (e.g. a sale must not
 *    fail because notifications were down).
 * 3. Do not pass mutable references — copy the payload at the call site.
 */

export type NotificationEventType =
  | "sales.created"
  | "sales.confirmed"
  | "sales.cancelled";

export type NotificationEventPayload = Readonly<Record<string, unknown>>;

export async function recordNotificationEvent(
  type: NotificationEventType,
  payload: NotificationEventPayload,
): Promise<void> {
  // Reference args so future implementations don't need a signature change
  // and so the linter doesn't flag them as unused.
  void type;
  void payload;

  try {
    // No-op for now. When the real notifications module ships, this is
    // where we'll write to the `Notification` table or push to a queue.
  } catch {
    // Belt-and-braces: even an empty try block guarantees the contract
    // documented above survives future edits.
  }
}
