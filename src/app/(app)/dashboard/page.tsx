import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";
import { requireAuth } from "@/shared/auth/dal";

const stats = [
  { label: "ใบรับซื้อวันนี้", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "น้ำหนักรับซื้อ (กก.)", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "จ่ายเงินรวม (บาท)", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
  { label: "เงินสดในลิ้นชัก", value: "—", hint: "เชื่อมข้อมูลใน Phase 3" },
] as const;

export default async function DashboardPage() {
  const me = await requireAuth();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          แดชบอร์ด
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ยินดีต้อนรับ {me.displayName}
          {me.isSuperAdmin ? " (Super Admin)" : ""}
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
          <CardTitle>ข้อมูลบัญชีของคุณ</CardTitle>
          <CardDescription>
            สิทธิ์และสาขาที่บัญชีของคุณเข้าถึงได้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">อีเมล</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {me.email}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">
                บทบาท (Roles)
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {me.roles.length > 0
                  ? me.roles.map((r) => r.name).join(", ")
                  : me.isSuperAdmin
                    ? "Super Admin (ทุกบทบาท)"
                    : "ยังไม่ได้กำหนดบทบาท"}
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">
                สาขาที่เข้าถึงได้
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {me.isSuperAdmin
                  ? "ทุกสาขา (Super Admin)"
                  : me.branches.length > 0
                    ? me.branches
                        .map((b) => `${b.code} – ${b.name}`)
                        .join(", ")
                    : "ยังไม่ได้ผูกสาขา"}
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">
                จำนวนสิทธิ์ที่ได้รับ
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {me.isSuperAdmin
                  ? "ทั้งหมด (Super Admin)"
                  : `${me.permissions.size} permission`}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
