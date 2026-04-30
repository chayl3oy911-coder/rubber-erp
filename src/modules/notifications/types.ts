/**
 * Notification module — public types.
 *
 * Each notification "rule" returns a single integer count plus a link target,
 * deliberately lightweight: this is a header badge, not a feed. When/if we
 * grow into a real notifications table this contract can be the public API
 * of a richer service that aggregates over rows.
 */

/**
 * Stable identifier for each rule. Used as the `key` in lists and as a
 * dictionary key in i18n — DO NOT reuse / rename without migrating both.
 */
export type NotificationKey =
  | "purchase.waiting_approval"
  | "purchase.awaiting_stock_in"
  | "stock.recent_adjustments";

export type NotificationItem = {
  key: NotificationKey;
  count: number;
  /** App-relative URL to navigate when the user clicks this item. */
  href: string;
};

export type NotificationsSummary = {
  /** Sum of all visible counts (drives the badge number on the bell). */
  total: number;
  /**
   * Items the *current actor* is allowed to see, filtered both by permission
   * and by `count > 0` so the dropdown is empty-state when there's nothing
   * actionable. Order is fixed (top → bottom) for predictable UX.
   */
  items: NotificationItem[];
  /** Convenience flag — `total > 0`. */
  hasAny: boolean;
};
