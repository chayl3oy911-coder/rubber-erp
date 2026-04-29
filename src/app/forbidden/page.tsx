import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        403
      </span>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        สิทธิ์ไม่เพียงพอ
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        บัญชีของคุณยังไม่มีสิทธิ์เข้าถึงหน้านี้
        หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        กลับไปหน้าแดชบอร์ด
      </Link>
    </div>
  );
}
