import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { LoginForm } from "./_components/login-form";

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
        <LoginForm />
      </CardContent>
    </Card>
  );
}
