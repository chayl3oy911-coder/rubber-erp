import { stockT } from "@/modules/stock/i18n";
import type { StockMovementType } from "@/modules/stock/types";

const t = stockT();

const STYLES: Record<StockMovementType, string> = {
  PURCHASE_IN:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ADJUST_IN:
    "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  ADJUST_OUT:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  SALES_OUT:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  PRODUCTION_OUT:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  PRODUCTION_IN:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  CANCEL_REVERSE:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  PURCHASE_RETURN_OUT:
    "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
};

type Props = {
  type: StockMovementType;
  size?: "sm" | "md";
};

export function MovementTypeBadge({ type, size = "sm" }: Props) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const cls = STYLES[type] ?? STYLES.PURCHASE_IN;
  const label = t.movementType[type] ?? type;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${sizeCls} ${cls}`}
    >
      {label}
    </span>
  );
}
