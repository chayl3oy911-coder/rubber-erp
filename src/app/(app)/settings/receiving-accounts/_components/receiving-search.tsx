"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { Input } from "@/shared/ui";

const t = receivingAccountT();

const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function ReceivingSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim() === "") params.delete("q");
    else params.set("q", q.trim());
    params.delete("page");
    const qs = params.toString();
    router.push(
      qs ? `/settings/receiving-accounts?${qs}` : "/settings/receiving-accounts",
    );
  }

  function clear() {
    setQ("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(
      qs ? `/settings/receiving-accounts?${qs}` : "/settings/receiving-accounts",
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        type="search"
        placeholder={t.placeholders.search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="flex-1"
      />
      <div className="flex gap-2">
        <button type="submit" className={buttonClass}>
          {t.actions.search}
        </button>
        {q ? (
          <button type="button" onClick={clear} className={buttonClass}>
            {t.actions.clear}
          </button>
        ) : null}
      </div>
    </form>
  );
}
