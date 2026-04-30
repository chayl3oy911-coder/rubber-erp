"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { customerT } from "@/modules/customer/i18n";
import { Input } from "@/shared/ui";

const t = customerT();

type Props = {
  initialQ?: string;
};

export function CustomerSearch({ initialQ = "" }: Props) {
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
    // Reset to first page whenever the query changes — otherwise users land on
    // an empty page when their previous offset overflows the new result set.
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/customers?${qs}` : "/customers");
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
        placeholder={t.placeholders.search}
        aria-label={t.actions.search}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.actions.clear}
        </button>
      ) : null}
    </form>
  );
}
