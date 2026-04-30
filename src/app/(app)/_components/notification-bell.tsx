"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { notificationsT } from "@/modules/notifications/i18n";
import type { NotificationsSummary } from "@/modules/notifications/types";

const t = notificationsT();

type Props = {
  summary: NotificationsSummary;
};

const buttonClass =
  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const badgeClass =
  "absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white shadow-sm";

const dropdownClass =
  "absolute right-0 top-full z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg sm:w-80 dark:border-zinc-800 dark:bg-zinc-950";

const itemClass =
  "flex items-start gap-3 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800/60";

const itemCountClass =
  "ml-auto inline-flex h-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

/**
 * NotificationBell — header dropdown driven entirely by props from the
 * server. Stateless re: data; the only client state is open/close.
 *
 * Click-outside / Escape closes the popover; we attach listeners only when
 * open to avoid global listener overhead.
 */
export function NotificationBell({ summary }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const dropdownId = `${id}-dropdown`;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent): void {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { total, items, hasAny } = summary;
  const badgeText = total > 99 ? "99+" : String(total);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t.bell.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={dropdownId}
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
      >
        <BellIcon />
        {hasAny ? (
          <span
            className={badgeClass}
            aria-label={t.bell.badgeAriaLabel(total)}
          >
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={dropdownId}
          role="menu"
          aria-label={t.dropdown.title}
          className={dropdownClass}
        >
          <div className="border-b border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {t.dropdown.title}
          </div>
          {hasAny ? (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={itemClass}
                  >
                    <span className="break-words">
                      {t.items[item.key](item.count)}
                    </span>
                    <span className={itemCountClass}>{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t.dropdown.empty}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
