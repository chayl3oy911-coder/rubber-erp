import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

const stats = [
  { label: "ใบรับซื้อวันนี้", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "น้ำหนักรับซื้อ (กก.)", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "จ่ายเงินรวม (บาท)", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "เงินสดในลิ้นชัก", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
] as const;

const phaseStatus = [
  { done: true, text: "โครงสร้างโฟลเดอร์ src/modules และ src/shared" },
  { done: true, text: "Layout ของ route group (app) และ (auth)" },
  { done: true, text: "Sidebar (desktop) + Bottom Nav (mobile)" },
  { done: true, text: "Shared UI: Button, Card, Input, Label" },
  { done: false, text: "Auth จริง / RBAC / Branch scope (Phase 1)" },
  { done: false, text: "Module: purchase-ticket, stock, production (Phase 3+)" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          แดชบอร์ด
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          โครงสร้าง Foundation พร้อมแล้ว — ขั้นถัดไปคือ Auth และ RBAC
        </p>
      </header>

      <section
        aria-label="สถิติภาพรวม"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {s.label}
              </span>
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {s.value}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {s.hint}
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>สถานะโปรเจกต์</CardTitle>
          <CardDescription>Phase 0 — Foundation</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {phaseStatus.map((s) => (
              <li
                key={s.text}
                className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300"
              >
                <span
                  aria-hidden="true"
                  className={
                    s.done
                      ? "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }
                >
                  {s.done ? "✓" : "·"}
                </span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
