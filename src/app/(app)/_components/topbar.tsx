export function Topbar() {
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
            ผู้ใช้ทดลอง
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Phase 0 · ยังไม่เชื่อม Auth
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        >
          ผ
        </div>
      </div>
    </header>
  );
}
