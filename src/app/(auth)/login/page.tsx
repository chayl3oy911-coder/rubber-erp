"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/shared/ui";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            R
          </span>
          <CardTitle>Rubber ERP</CardTitle>
        </div>
        <CardDescription>
          ระบบหลังบ้านสำหรับลานรับซื้อยางพารา
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" disabled className="mt-2 w-full">
            เข้าสู่ระบบ
          </Button>
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            UI เท่านั้นในรอบนี้ — เชื่อม Auth จริงใน Phase 1
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
