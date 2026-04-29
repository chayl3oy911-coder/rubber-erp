"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { NavIcon } from "./nav-icon";
import { navItems } from "./nav-items";

const mobileItems = navItems.slice(0, 5);

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก (มือถือ)"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-zinc-200 bg-white",
        "pb-[env(safe-area-inset-bottom)]",
        "md:hidden",
        "dark:border-zinc-800 dark:bg-zinc-950",
      )}
    >
      {mobileItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
              active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            <NavIcon name={item.icon} className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
