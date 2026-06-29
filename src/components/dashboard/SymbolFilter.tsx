"use client";

interface SymbolFilterProps {
  symbols: string[];
  selected: string | null;
  onChange: (symbol: string | null) => void;
}

export function SymbolFilter({ symbols, selected, onChange }: SymbolFilterProps) {
  if (symbols.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Symbol</span>
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
      {symbols.map((symbol) => (
        <button
          key={symbol}
          type="button"
          onClick={() => onChange(symbol)}
          className={`cursor-pointer rounded-full px-3 py-1 font-mono text-xs font-medium transition-colors ${
            selected === symbol
              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}
