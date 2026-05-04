import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import {
  isPurchaseReturnStatus,
  type PurchaseReturnStatus,
} from "@/modules/purchase-return/types";

const t = purchaseReturnT();

const STYLES: Record<PurchaseReturnStatus, string> = {
  DRAFT:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED:
    "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  CANCELLED:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

type Props = {
  status: string;
  size?: "sm" | "md";
};

export function PurchaseReturnStatusBadge({ status, size = "sm" }: Props) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const safeStatus = isPurchaseReturnStatus(status) ? status : "DRAFT";
  const cls = STYLES[safeStatus];
  const label = t.status[safeStatus];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${sizeCls} ${cls}`}
    >
      {label}
    </span>
  );
}
