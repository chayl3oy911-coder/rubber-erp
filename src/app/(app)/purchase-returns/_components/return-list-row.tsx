import Link from "next/link";

import type { PurchaseReturnDTO } from "@/modules/purchase-return/dto";
import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import { purchaseReturnReasonLabel } from "@/modules/purchase-return/types";

import { PurchaseReturnStatusBadge } from "./return-status-badge";

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
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  row: PurchaseReturnDTO;
  showBranchColumn: boolean;
};

export function PurchaseReturnListRow({ row, showBranchColumn }: Props) {
  const supplier =
    row.purchaseTicket?.customerName ?? row.customerNameSnapshot ?? "—";
  const ticketNo =
    row.purchaseTicket?.ticketNo ?? row.ticketNoSnapshot ?? "—";
  const lotNo = row.stockLot?.lotNo ?? row.lotNoSnapshot ?? "—";

  return (
    <li>
      <Link
        href={`/purchase-returns/${row.id}`}
        className="block rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                {row.returnNo}
              </span>
              <PurchaseReturnStatusBadge status={row.status} />
            </div>
            <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {supplier}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {ticketNo} · {lotNo}
              {showBranchColumn && row.branch ? ` · ${row.branch.code}` : ""}
              {" · "}
              {formatDate(row.createdAt)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.fields.reasonType}: {purchaseReturnReasonLabel(row.returnReasonType)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 sm:items-end">
            <span className="whitespace-nowrap text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatNumber(row.returnWeight, 2)} กก.
            </span>
            <span className="whitespace-nowrap text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              ต้นทุนคืน: {formatNumber(row.returnCostAmount, 2)} บาท
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
