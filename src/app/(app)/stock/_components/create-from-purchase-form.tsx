"use client";

import { createLotFromPurchaseAction } from "@/modules/stock/actions";
import { stockT } from "@/modules/stock/i18n";

const t = stockT();

const submitClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700";

type Props = {
  purchaseTicketId: string;
  ticketNo: string;
};

/**
 * Tiny client wrapper around the `createLotFromPurchaseAction` Server Action.
 * Bound to the ticket id so the form is self-contained and can be rendered
 * once per row in the eligible-purchases list.
 *
 * `window.confirm` is the simplest accessible confirmation that doesn't
 * require shipping a modal library. Default OS styling, keyboard-friendly,
 * server-renderable when JS is disabled (form just submits without confirm).
 */
export function CreateFromPurchaseForm({
  purchaseTicketId,
  ticketNo,
}: Props) {
  const action = createLotFromPurchaseAction.bind(null, purchaseTicketId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    const ok = window.confirm(t.actions.confirmCreateLotPrompt(ticketNo));
    if (!ok) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={onSubmit}>
      <button type="submit" className={submitClass}>
        {t.actions.createLot}
      </button>
    </form>
  );
}
