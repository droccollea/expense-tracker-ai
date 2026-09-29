"use client";

import { CATEGORIES, Category, EMPTY_FILTERS, ExpenseFilters } from "@/lib/types";
import { toISODate } from "@/lib/format";
import { SearchIcon, XIcon } from "./Icons";

interface Props {
  filters: ExpenseFilters;
  onChange: (f: ExpenseFilters) => void;
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: "This month",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth(), 1)), toISODate(n)];
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)), toISODate(n)];
    },
  },
  {
    label: "This year",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), 0, 1)), toISODate(n)];
    },
  },
];

export function FiltersBar({ filters, onChange }: Props) {
  const set = <K extends keyof ExpenseFilters>(k: K, v: ExpenseFilters[K]) => onChange({ ...filters, [k]: v });
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;

  const input =
    "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="card space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-12">
        <label className="relative md:col-span-4">
          <span className="sr-only">Search</span>
          <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={`${input} pl-9`}
          />
        </label>
        <label className="md:col-span-3">
          <span className="sr-only">Category</span>
          <select value={filters.category} onChange={(e) => set("category", e.target.value as Category | "All")} className={input}>
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2 md:col-span-5">
          <label className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs font-medium text-slate-500 sm:w-auto">From</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} className={input} />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-xs font-medium text-slate-500 sm:w-auto">To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} className={input} />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const [from, to] = p.range();
          const on = filters.from === from && filters.to === to;
          return (
            <button
              key={p.label}
              onClick={() => onChange({ ...filters, from: on ? "" : from, to: on ? "" : to })}
              aria-pressed={on}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                on ? "bg-brand-50 text-brand-700 ring-brand-200" : "text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {rangeInvalid && <span className="text-xs font-medium text-red-600">“From” date is after “To” date.</span>}
        {active && (
          <button onClick={() => onChange(EMPTY_FILTERS)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <XIcon width={14} height={14} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
