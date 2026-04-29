import { logoutAction } from "@/shared/auth/actions";
import { currentUser } from "@/shared/auth/dal";

export async function Topbar() {
  const me = await currentUser();
  const initial = me?.displayName?.charAt(0).toUpperCase() ?? "?";
  const subtitle = me
    ? me.isSuperAdmin
      ? "Super Admin"
      : (me.roles[0]?.name ?? "ยังไม่ได้กำหนดบทบาท")
    : "ยังไม่เข้าสู่ระบบ";

  return (
    <header
      className={[
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur",
        "md:px-6 dark:border-zinc-800 dark:bg-zinc-950/80",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          R
        </span>
        <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Rubber ERP
        </span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="hidden text-right md:block">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {me?.displayName ?? "ผู้ใช้"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        >
          {initial}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}
