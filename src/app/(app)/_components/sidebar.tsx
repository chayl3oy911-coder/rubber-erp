"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { NavIcon } from "./nav-icon";
import { navItems } from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="เมนูหลัก"
      className={cn(
        "hidden shrink-0 flex-col border-r border-zinc-200 bg-white",
        "md:flex md:w-64",
        "dark:border-zinc-800 dark:bg-zinc-950",
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-5 dark:border-zinc-800">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          R
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Rubber ERP
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ลานรับซื้อยางพารา
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <NavIcon name={item.icon} className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Phase 0 · Foundation
      </div>
    </aside>
  );
}
