import type { ReactNode } from "react";

import { ToastProvider } from "@/shared/ui";

import { MobileNav } from "./_components/mobile-nav";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  // ToastProvider is mounted at the (app) layout root so any client
  // component below can call `useToast()` without each route worrying
  // about provider plumbing. It renders nothing visible until a toast is
  // queued, so the cost on routes that never push one is negligible.
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
