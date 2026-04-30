import { salesT } from "@/modules/sales/i18n";
import type { SaleType } from "@/modules/sales/types";

const t = salesT();

const STYLES: Record<SaleType, string> = {
  SALE: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  CONSIGNMENT:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
};

type Props = {
  type: SaleType;
  size?: "sm" | "md";
};

export function SaleTypeBadge({ type, size = "sm" }: Props) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const cls = STYLES[type] ?? STYLES.SALE;
  const label = t.saleType[type] ?? type;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${sizeCls} ${cls}`}
    >
      {label}
    </span>
  );
}
