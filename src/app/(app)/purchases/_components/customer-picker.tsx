"use client";

import { useEffect, useRef, useState } from "react";

import type { CustomerDTO } from "@/modules/customer/dto";
import { purchaseT } from "@/modules/purchase/i18n";
import { Input, Label } from "@/shared/ui";

const t = purchaseT();

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 20;
const MIN_SEARCH_LENGTH = 1;

type CustomerLike = Pick<CustomerDTO, "id" | "code" | "fullName" | "phone">;

type Props = {
  name?: string;
  branchId: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
};

/**
 * Server-driven customer picker.
 *
 * Design choices:
 * - Never preload: the page that hosts this component does NOT fetch the full
 *   customer list. The first paint shows only an empty search field plus a
 *   hint.
 * - On each keystroke (debounced), we hit `/api/customers?q=...&branchId=...`
 *   which already enforces branch scope, active-only, and pagination on the
 *   server. The DB never returns out-of-scope rows — even if a malicious
 *   client tampers with `branchId`, the API will respond empty.
 * - `branchId` change resets the picker (selection becomes invalid because a
 *   customer is bound to a single branch).
 * - Stale request cancellation via `AbortController` so a slow network can't
 *   overwrite a newer typed query.
 * - Bank-account info is intentionally NOT shown here — keeps the picker tight
 *   for high-volume daily use. Operators see the customer's banks on the
 *   ticket detail/edit screen.
 */
export function CustomerPicker({
  name = "customerId",
  branchId,
  required = false,
  disabled = false,
  error,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReadonlyArray<CustomerLike>>([]);
  const [selected, setSelected] = useState<CustomerLike | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset picker state when the branch changes — a customer from branch A is
  // never valid for branch B.
  useEffect(() => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, [branchId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  function runSearch(q: string): void {
    if (abortRef.current) abortRef.current.abort();
    if (q.trim().length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }
    if (!branchId) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setSearchError(null);

    const url = new URL("/api/customers", window.location.origin);
    url.searchParams.set("q", q.trim());
    url.searchParams.set("branchId", branchId);
    url.searchParams.set("pageSize", String(SEARCH_PAGE_SIZE));

    fetch(url.toString(), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json() as Promise<{
          customers: CustomerLike[];
          total: number;
        }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResults(data.customers ?? []);
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setSearchError(t.errors.customerSearchFailed);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });
  }

  function onQueryChange(next: string): void {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(next), SEARCH_DEBOUNCE_MS);
  }

  function onSelect(customer: CustomerLike): void {
    setSelected(customer);
    setQuery("");
    setResults([]);
  }

  function onClear(): void {
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {t.fields.customer}
          {required ? <span className="text-red-600"> *</span> : null}
        </Label>
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-mono uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {selected.code}
            </span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {selected.fullName}
            </span>
            {selected.phone ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {selected.phone}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="inline-flex h-8 items-center rounded-md border border-emerald-300 bg-white px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
          >
            {t.placeholders.customerChange}
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${name}-search`}>
        {t.fields.customer}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>

      <Input
        id={`${name}-search`}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={t.placeholders.customerSearch}
        disabled={disabled || !branchId}
        autoComplete="off"
      />

      {/* Empty hidden input so the form still posts customerId="" if the user
          forgets to pick — Zod will then surface a 400 with customerInvalid. */}
      <input type="hidden" name={name} value="" />

      {!query ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.placeholders.customerSearchHint}
        </p>
      ) : isLoading ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          {t.placeholders.customerSearching}
        </p>
      ) : searchError ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {searchError}
        </p>
      ) : results.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          {t.placeholders.customerNoMatches(query)}
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {results.map((c) => (
            <li
              key={c.id}
              className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
            >
              <button
                type="button"
                onClick={() => onSelect(c)}
                disabled={disabled}
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500/10"
              >
                <div className="flex flex-1 flex-col">
                  <span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {c.code}
                    </span>
                    <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-50">
                      {c.fullName}
                    </span>
                  </span>
                  {c.phone ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.phone}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
