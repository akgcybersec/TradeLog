"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, LayoutDashboard } from "lucide-react";

export type DashboardView = "calendar" | "detailed";

interface DashboardViewToggleProps {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
}

const options: { id: DashboardView; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "detailed", label: "Detailed", icon: LayoutDashboard },
];

export function DashboardViewToggle({ view, onChange }: DashboardViewToggleProps) {
  const reduce = useReducedMotion();

  return (
    <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/50 p-1">
      {options.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`relative flex cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
              active ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {active && !reduce && (
              <motion.span
                layoutId="dashboard-view-pill"
                className="absolute inset-0 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {active && reduce && (
              <span className="absolute inset-0 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/25" />
            )}
            <Icon className="relative h-4 w-4" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
