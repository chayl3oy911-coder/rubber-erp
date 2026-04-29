"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalAppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("App error caught by error.tsx:", error);
  }, [error]);

  const isMissingAppUser = error.name === "MissingAppUserError";
  const isInactive = error.name === "InactiveAccountError";
  const isAuthIssue = isMissingAppUser || isInactive;

  let title = "เกิดข้อผิดพลาด";
  let message = error.message || "กรุณาลองใหม่อีกครั้ง";

  if (isMissingAppUser) {
    title = "ไม่พบบัญชีผู้ใช้";
  } else if (isInactive) {
    title = "บัญชีถูกระงับ";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          ลองใหม่
        </button>
        {isAuthIssue ? (
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            กลับไปหน้า Login
          </Link>
        ) : null}
      </div>
    </div>
  );
}
