"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { salesT } from "@/modules/sales/i18n";
import { Input } from "@/shared/ui";

const t = salesT();

type Props = {
  initialQ?: string;
  basePath?: string;
};

/**
 * Debounced search box. Same shape/behaviour as the Stock module's search —
 * intentional duplication keeps the modules independent (shared components
 * would couple them and force breaking changes when one needs new params).
 */
export function SalesSearch({ initialQ = "", basePath = "/sales" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialQ);
  }, [initialQ]);

  function commit(next: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim() === "") {
      params.delete("q");
    } else {
      params.set("q", next.trim());
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath);
  }

  function onChange(next: string): void {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), 300);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(value);
  }

  function onClear(): void {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    commit("");
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex w-full items-center gap-2 sm:max-w-md"
    >
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.placeholders.listSearch}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.actions.clear}
        </button>
      ) : null}
    </form>
  );
}
