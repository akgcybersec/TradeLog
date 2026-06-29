"use client";

interface ChipFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onChange: (value: string | null) => void;
}

export function ChipFilter({ label, options, selected, onChange }: ChipFilterProps) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected === null
            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
            : "bg-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === opt.value
              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
