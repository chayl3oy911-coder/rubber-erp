import { salesT } from "@/modules/sales/i18n";
import type { SalesOrderStatus } from "@/modules/sales/types";

const t = salesT();

const STYLES: Record<SalesOrderStatus, string> = {
  DRAFT:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

type Props = {
  status: SalesOrderStatus;
  size?: "sm" | "md";
};

export function SalesStatusBadge({ status, size = "md" }: Props) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const cls = STYLES[status] ?? STYLES.DRAFT;
  const label = t.status[status] ?? status;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${sizeCls} ${cls}`}
    >
      {label}
    </span>
  );
}
