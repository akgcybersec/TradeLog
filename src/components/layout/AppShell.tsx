"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useViewSettings } from "@/contexts/ViewSettingsContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { viewSettings } = useViewSettings();
  const zoom = viewSettings.viewUiZoom / 100;

  return (
    <div
      className="app-shell-root relative flex min-h-screen bg-slate-950"
      style={{ zoom }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950" />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1 overflow-auto">
          <div className="view-content mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
