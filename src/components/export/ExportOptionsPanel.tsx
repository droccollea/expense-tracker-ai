"use client";

import type { Dispatch, ReactNode } from "react";
import { CATEGORIES, CATEGORY_STYLES, type Category, type Expense } from "@/lib/types";
import { COLUMN_LABELS, EXPORTERS, EXPORT_COLUMNS, type ExportFormatId, type SortOrder } from "@/lib/export";
import { RANGE_PRESETS, type ExportAction, type ExportState } from "@/hooks/useExportOptions";
import { formatCurrency, todayISO } from "@/lib/format";


const FORMAT_ICONS: Record<ExportFormatId, ReactNode> = {
  csv: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  json: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  ),
};

interface Props {
  state: ExportState;
  dispatch: Dispatch<ExportAction>;
  rowsInRange: Expense[];
  errors: Partial<Record<"range" | "categories" | "filename", string>>;
  disabled: boolean;
}

export function ExportOptionsPanel({ state, dispatch, rowsInRange, errors, disabled }: Props) {
  const exporter = EXPORTERS[state.format];
  const stats = new Map<Category, { count: number; cents: number }>();
  for (const e of rowsInRange) {
    const s = stats.get(e.category) ?? { count: 0, cents: 0 };
    stats.set(e.category, { count: s.count + 1, cents: s.cents + e.amountCents });
  }
  const allSelected = state.categories.length === CATEGORIES.length;

  return (
    <fieldset disabled={disabled} className="space-y-7">
      <Section step={1} title="Format">
        <div role="radiogroup" aria-label="Export format" className="grid grid-cols-3 gap-2">
          {Object.values(EXPORTERS).map((x) => {
            const selected = state.format === x.id;
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => dispatch({ type: "format", format: x.id })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {FORMAT_ICONS[x.id]}
                {x.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">{exporter.description}</p>
      </Section>

      <Section step={2} title="Date range" error={errors.range}>
        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <Chip key={p.id} active={state.preset === p.id} onClick={() => dispatch({ type: "preset", preset: p.id })}>
              {p.label}
            </Chip>
          ))}
          <Chip active={state.preset === "custom"} onClick={() => document.getElementById("export-from")?.focus()}>
            Custom
          </Chip>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DateInput id="export-from" label="Start date" value={state.from} max={state.to || todayISO()} onChange={(v) => dispatch({ type: "from", value: v })} invalid={!!errors.range} />
          <DateInput id="export-to" label="End date" value={state.to} min={state.from || undefined} onChange={(v) => dispatch({ type: "to", value: v })} invalid={!!errors.range} />
        </div>
      </Section>

      <Section
        step={3}
        title="Categories"
        error={errors.categories}
        action={
          <button
            type="button"
            onClick={() => dispatch({ type: "categories", categories: allSelected ? [] : [...CATEGORIES] })}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        }
      >
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {CATEGORIES.map((c) => {
            const checked = state.categories.includes(c);
            const s = stats.get(c) ?? { count: 0, cents: 0 };
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-slate-50 ${checked ? "text-slate-900" : "bg-slate-50/60 text-slate-400"}`}
              >
                <input type="checkbox" checked={checked} onChange={() => dispatch({ type: "toggleCategory", category: c })} className="h-4 w-4 rounded border-slate-300 accent-brand-500" />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[c].color, opacity: checked ? 1 : 0.4 }} aria-hidden />
                <span className="flex-1 truncate">{c}</span>
                <span className="text-xs tabular-nums text-slate-400">
                  {s.count} · {formatCurrency(s.cents)}
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section step={4} title="Layout">
        {exporter.supportsColumns ? (
          <>
            <p className="mb-2 text-xs font-medium text-slate-500">Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_COLUMNS.map((col) => {
                const on = state.columns.includes(col);
                const locked = on && state.columns.length === 1;
                return (
                  <Chip key={col} active={on} onClick={() => dispatch({ type: "toggleColumn", column: col })} title={locked ? "At least one column is required" : undefined}>
                    {on ? "✓ " : ""}
                    {COLUMN_LABELS[col]}
                  </Chip>
                );
              })}
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">JSON always includes every field plus export metadata and a summary.</p>
        )}
        <label className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-xs font-medium text-slate-500">Sort by</span>
          <select
            value={state.sort}
            onChange={(e) => dispatch({ type: "sort", sort: e.target.value as SortOrder })}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount first</option>
          </select>
        </label>
      </Section>

      <Section step={5} title="File name" error={errors.filename}>
        <div className={`flex overflow-hidden rounded-lg border bg-white shadow-sm focus-within:ring-2 ${errors.filename ? "border-red-400 focus-within:ring-red-100" : "border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-100"}`}>
          <input
            id="export-filename"
            aria-label="File name"
            aria-invalid={!!errors.filename}
            value={state.filename}
            onChange={(e) => dispatch({ type: "filename", filename: e.target.value })}
            spellCheck={false}
            className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-900 outline-none"
          />
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">.{exporter.extension}</span>
        </div>
      </Section>
    </fieldset>
  );
}

function Section({ step, title, error, action, children }: { step: number; title: string; error?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{step}</span>
        <h3 className="flex-1 text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function Chip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
        active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function DateInput({ id, label, value, min, max, invalid, onChange }: { id: string; label: string; value: string; min?: string; max?: string; invalid: boolean; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-0 rounded-lg border bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 ${invalid ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"}`}
      />
    </label>
  );
}
