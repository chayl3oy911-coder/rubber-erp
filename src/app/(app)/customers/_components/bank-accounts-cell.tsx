import { customerBankLabel } from "@/modules/customer/banks";
import type { CustomerBankAccountDTO } from "@/modules/customer/dto";
import { customerT } from "@/modules/customer/i18n";

const t = customerT();

type Props = {
  accounts: ReadonlyArray<CustomerBankAccountDTO>;
  /** Compact rendering for table rows — wider variant used on mobile cards. */
  compact?: boolean;
};

/**
 * Bank-account cell for the list view.
 *
 * Behavior:
 * - 0 accounts → "—"
 * - 1+ account → show the primary account inline (bank label + masked-ish acct
 *   no.). When >1, render a `<details>` so the operator can peek at all of
 *   them without leaving the list page.
 *
 * `<details>`/`<summary>` is a server-friendly disclosure widget — no client
 * JS, no hydration cost. Browsers handle keyboard a11y (Enter/Space) by
 * default.
 */
export function BankAccountsCell({ accounts, compact = false }: Props) {
  if (accounts.length === 0) {
    return (
      <span className="text-zinc-500 dark:text-zinc-500">
        {t.empty.noBankAccounts}
      </span>
    );
  }

  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
  const others = accounts.filter((a) => a.id !== primary.id);
  const primaryLine = formatLine(primary);

  if (others.length === 0) {
    return (
      <span className={compact ? "text-sm" : "text-sm"}>{primaryLine}</span>
    );
  }

  return (
    <details className="group">
      <summary
        className={`cursor-pointer list-none ${compact ? "text-sm" : "text-sm"}`}
      >
        <span>{primaryLine}</span>
        <span className="ml-2 text-xs text-emerald-700 underline-offset-2 group-open:hidden hover:underline dark:text-emerald-400">
          {t.misc.otherBankAccounts(others.length)}
        </span>
        <span className="ml-2 hidden text-xs text-emerald-700 underline-offset-2 group-open:inline hover:underline dark:text-emerald-400">
          {t.actions.hideAllBankAccounts}
        </span>
      </summary>
      <ul className="mt-2 flex flex-col gap-1 border-l-2 border-zinc-200 pl-3 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {others.map((a) => (
          <li key={a.id}>{formatLine(a)}</li>
        ))}
      </ul>
    </details>
  );
}

function formatLine(account: CustomerBankAccountDTO): string {
  // Note: we deliberately omit the "primary" tag here — list pages already
  // surface the primary account inline (it's always rendered first), so the
  // tag is redundant. The form page renders its own primary indicator via a
  // radio control; that path is unaffected by this helper.
  const bank = customerBankLabel(account.bankName) ?? account.bankName;
  const tail = account.accountName ? ` · ${account.accountName}` : "";
  return `${bank} · ${account.bankAccountNo}${tail}`;
}
