import { purchaseT } from "@/modules/purchase/i18n";
import type { PurchaseStatus } from "@/modules/purchase/status";

const t = purchaseT();

const STYLES: Record<PurchaseStatus, string> = {
  DRAFT:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  WAITING_QC:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  WAITING_APPROVAL:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  APPROVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

type Props = {
  status: PurchaseStatus;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "md" }: Props) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const cls = STYLES[status];
  const label = t.status[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeCls} ${cls}`}
    >
      {label}
    </span>
  );
}
