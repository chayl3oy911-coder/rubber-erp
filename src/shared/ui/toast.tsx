"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Shared toast primitives.
 *
 * Why hand-rolled instead of pulling in a library: this codebase keeps zero
 * runtime UI dependencies on purpose (see AGENTS.md "no new packages unless
 * necessary"). The footprint we need — push a queue of timed messages,
 * support a few semantic variants, allow a "details" list for bulk results
 * — is small and maps cleanly onto React state + a single `<aside>`.
 *
 * Architecture notes:
 *
 *   - `ToastProvider` owns the queue and exposes a stable `show / dismiss`
 *     pair via context. Stable because consumers will sometimes call
 *     `show` from inside async callbacks; an unstable identity there
 *     defeats memoised event handlers.
 *
 *   - `ToastRegion` renders the visual stack. Splitting it from the
 *     provider lets pages mount the region exactly once (in the (app)
 *     layout) while modules deeper in the tree only consume `useToast`.
 *
 *   - Auto-dismiss uses `setTimeout` per toast and clears on unmount.
 *     We deliberately do NOT close on outside click: the bulk-result
 *     toast contains a scrollable list of failed tickets that the user
 *     might be in the middle of reading.
 *
 *   - Variants are semantic, not colour-named — the colour map can shift
 *     without API churn.
 */

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastDetailItem = {
  /** Stable per-row key for React reconciliation. */
  id: string;
  /** Single-line label, e.g. ticket no + reason. */
  text: string;
};

export type ToastInput = {
  variant?: ToastVariant;
  title: string;
  /** Optional secondary line under the title. */
  description?: string;
  /**
   * Optional list of per-item lines (used by bulk results to enumerate
   * partial failures). Capped to ~10 in the renderer; provide a tail
   * "+N more" entry yourself if you need a count beyond that.
   */
  details?: ReadonlyArray<ToastDetailItem>;
  /**
   * Auto-dismiss timeout in ms. `null` keeps the toast until the user
   * explicitly closes it. Defaults to 4500ms for success/info, 7000ms
   * for warning, and `null` for error (which usually carries actions).
   */
  durationMs?: number | null;
};

type ToastEntry = ToastInput & {
  id: string;
  variant: ToastVariant;
  durationMs: number | null;
};

type ToastContextValue = {
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function defaultDuration(variant: ToastVariant): number | null {
  switch (variant) {
    case "success":
    case "info":
      return 4500;
    case "warning":
      return 7000;
    case "error":
      // Errors stay until dismissed — they often surface action items.
      return null;
  }
}

/** Stable random id so SSR + first client render don't clash. */
function makeToastId(): string {
  // The provider runs only on the client, so plain Math.random is fine.
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ReadonlyArray<ToastEntry>>([]);
  // We track timers in a ref so they survive re-renders; the cleanup
  // effect at unmount clears them all.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = makeToastId();
      const variant: ToastVariant = input.variant ?? "info";
      const durationMs =
        input.durationMs === undefined
          ? defaultDuration(variant)
          : input.durationMs;
      const entry: ToastEntry = { ...input, id, variant, durationMs };
      setToasts((prev) => [...prev, entry]);
      if (durationMs !== null && durationMs > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss }), [
    show,
    dismiss,
  ]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast must be used inside <ToastProvider>. Mount it once at the layout root.",
    );
  }
  return ctx;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100",
  info: "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
};

const DETAIL_CAP = 10;

function ToastRegion({
  toasts,
  dismiss,
}: {
  toasts: ReadonlyArray<ToastEntry>;
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <aside
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} entry={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </aside>
  );
}

function ToastCard({
  entry,
  onDismiss,
}: {
  entry: ToastEntry;
  onDismiss: () => void;
}) {
  const visibleDetails = entry.details?.slice(0, DETAIL_CAP) ?? [];
  const overflow = (entry.details?.length ?? 0) - visibleDetails.length;
  return (
    <div
      role={entry.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border p-3 shadow-lg ring-1 ring-black/5",
        VARIANT_CLASSES[entry.variant],
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">{entry.title}</p>
          {entry.description ? (
            <p className="mt-0.5 text-sm leading-5 opacity-90">
              {entry.description}
            </p>
          ) : null}
          {visibleDetails.length > 0 ? (
            <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs leading-5 opacity-90">
              {visibleDetails.map((d) => (
                <li key={d.id}>{d.text}</li>
              ))}
              {overflow > 0 ? (
                <li className="list-none pl-0 opacity-70">+{overflow} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-current opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
