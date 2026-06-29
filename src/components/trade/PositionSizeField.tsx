"use client";

import type { PositionUnit } from "@/types/trade";
import { ChevronDown } from "lucide-react";

interface PositionSizeFieldProps {
  value: string;
  unit: PositionUnit;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: PositionUnit) => void;
  required?: boolean;
}

export function PositionSizeField({
  value,
  unit,
  onValueChange,
  onUnitChange,
  required,
}: PositionSizeFieldProps) {
  return (
    <div className="group flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50 transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "" || /^\d*\.?\d*$/.test(next)) {
            onValueChange(next);
          }
        }}
        placeholder="0.10"
        required={required}
        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        aria-label="Position size value"
      />
      <div className="relative flex shrink-0 items-center border-l border-slate-700 bg-slate-900/80">
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as PositionUnit)}
          className="cursor-pointer appearance-none border-0 bg-transparent py-2.5 pl-3 pr-8 text-sm text-slate-300 focus:outline-none"
          aria-label="Position size unit"
        >
          <option value="lots">Lots</option>
          <option value="units">Units</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-500" />
      </div>
    </div>
  );
}
