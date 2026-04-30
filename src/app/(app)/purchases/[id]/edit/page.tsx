import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updatePurchaseAction } from "@/modules/purchase/actions";
import { purchaseT } from "@/modules/purchase/i18n";
import { getPurchase } from "@/modules/purchase/service";
import { requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { PurchaseForm } from "../../_components/purchase-form";
import { StatusBadge } from "../../_components/status-badge";

const t = purchaseT();

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("purchase.update");
  const { id } = await params;

  const purchase = await getPurchase(me, id);
  if (!purchase) notFound();

  // Editing is only useful in DRAFT or WAITING_QC. Other statuses redirect to
  // the detail page where action buttons live.
  if (
    purchase.status !== "DRAFT" &&
    purchase.status !== "WAITING_QC"
  ) {
    redirect(`/purchases/${id}`);
  }

  // Bind the action with the ticket id once on the server.
  const boundAction = updatePurchaseAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`/purchases/${id}`}
          className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t.actions.back}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {t.page.editTitle}{" "}
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {purchase.ticketNo}
              </span>
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.page.editSubtitle(t.status[purchase.status] ?? purchase.status)}
            </p>
          </div>
          <StatusBadge status={purchase.status} />
        </div>
      </header>

      <Card>
        <CardContent>
          <PurchaseForm
            mode="edit"
            action={boundAction}
            status={purchase.status}
            initialValue={{
              rubberType: purchase.rubberType,
              grossWeight: purchase.grossWeight,
              tareWeight: purchase.tareWeight,
              netWeight: purchase.netWeight,
              pricePerKg: purchase.pricePerKg,
              totalAmount: purchase.totalAmount,
              withholdingTaxPercent: purchase.withholdingTaxPercent,
              withholdingTaxAmount: purchase.withholdingTaxAmount,
              netPayableAmount: purchase.netPayableAmount,
              note: purchase.note,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
