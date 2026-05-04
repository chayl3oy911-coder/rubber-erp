import Link from "next/link";

import type { PurchaseReturnDTO } from "@/modules/purchase-return/dto";
import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import { purchaseReturnReasonLabel } from "@/modules/purchase-return/types";

import { PurchaseReturnStatusBadge } from "../../../purchase-returns/_components/return-status-badge";

const t = purchaseReturnT();

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  returns: PurchaseReturnDTO[];
};

export function PurchaseReturnHistoryList({ returns }: Props) {
  if (returns.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        ไม่มีรายการคืนสินค้าในใบรับซื้อนี้
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
      {returns.map((r) => (
        <li key={r.id}>
          <Link
            href={`/purchase-returns/${r.id}`}
            className="flex flex-col gap-1 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                {r.returnNo}
              </span>
              <PurchaseReturnStatusBadge status={r.status} />
              <span className="ml-auto text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                {formatNumber(r.returnWeight, 2)} กก. ·{" "}
                {formatNumber(r.returnCostAmount, 2)} บาท
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatDate(r.createdAt)} ·{" "}
              {t.fields.reasonType}: {purchaseReturnReasonLabel(r.returnReasonType)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
