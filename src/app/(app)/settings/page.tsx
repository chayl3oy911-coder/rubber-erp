import Link from "next/link";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { hasPermission, requireAuth } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

const t = receivingAccountT();

const ghostLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

/**
 * `/settings` is the central jumping-off page for system-level master data.
 * Today it lists a single tile (receiving accounts); it will gain more
 * tiles in future steps (notifications, document templates, etc.) so the
 * layout is intentionally a card grid even with just one entry.
 *
 * Each tile is permission-gated — users without the relevant `read`
 * permission won't see the link. We don't 404 the parent page because
 * once more tiles exist a user might have access to *some* of them.
 */
export default async function SettingsRootPage() {
  const me = await requireAuth();
  const canSeeReceiving = hasPermission(me, "settings.receivingAccount.read");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t.page.settingsTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t.page.settingsSubtitle}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canSeeReceiving ? (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.page.listTitle}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t.page.listSubtitle}
                </p>
              </div>
              <div className="flex justify-end">
                <Link
                  href="/settings/receiving-accounts"
                  className={ghostLinkClass}
                >
                  {t.actions.goToSettings}
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
