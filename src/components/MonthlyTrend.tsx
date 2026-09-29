"use client";

import { useState } from "react";
import { Expense } from "@/lib/types";
import { monthlyTotals } from "@/lib/analytics";
import { formatCompactCurrency, formatCurrency, formatMonthKey } from "@/lib/format";

/** Round a raw step up to 1/2/2.5/5 × 10^n so axis ticks land on friendly values. */
function niceStep(raw: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * exp;
}

function axisTicks(maxCents: number): number[] {
  if (maxCents <= 0) return [0, 2_500, 5_000, 7_500, 10_000];
  const step = niceStep(maxCents / 4);
  const count = Math.ceil(maxCents / step);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

const RANGES = [6, 12] as const;

/** Column chart of monthly totals with a hover tooltip. */
export function MonthlyTrend({ expenses }: { expenses: Expense[] }) {
  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [hover, setHover] = useState<number | null>(null);
  const data = monthlyTotals(expenses, months);
  const ticks = axisTicks(Math.max(...data.map((d) => d.cents)));
  const max = ticks[ticks.length - 1];
  const avg = data.reduce((s, d) => s + d.cents, 0) / data.length;

  return (
    <section className="card p-5" aria-labelledby="trend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="text-base font-semibold text-slate-900">Monthly spending</h2>
          <p className="text-sm text-slate-500">
            Average <span className="tabular-nums font-medium text-slate-700">{formatCurrency(Math.round(avg))}</span> / month
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setMonths(r)}
              aria-pressed={months === r}
              className={`rounded-md px-2.5 py-1 transition ${months === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex h-56 gap-2">
        {/* y-axis labels */}
        <div className="relative w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>
              {formatCompactCurrency(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-dashed border-slate-100"}`} style={{ bottom: `${(t / max) * 100}%` }} />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const h = (d.cents / max) * 100;
              const active = hover === i;
              return (
                <div
                  key={d.key}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${formatMonthKey(d.key, "long")}: ${formatCurrency(d.cents)}`}
                >
                  {active && <div className="absolute inset-y-0 inset-x-[10%] rounded-md bg-slate-50" aria-hidden />}
                  <div
                    className="relative w-3/5 max-w-10 rounded-t transition-all duration-500"
                    style={{ height: `${h}%`, minHeight: d.cents ? 3 : 0, backgroundColor: "#2a78d6", opacity: hover === null || active ? 1 : 0.55 }}
                  />
                  {active && (
                    <div
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                      style={{ bottom: `calc(${h}% + 8px)` }}
                      role="tooltip"
                    >
                      <div className="text-slate-300">{formatMonthKey(d.key, "long")}</div>
                      <div className="font-semibold tabular-nums">{formatCurrency(d.cents)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-12 mt-2 flex gap-[2px] text-[11px] text-slate-500">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center">
            {months === 12 && i % 2 === 1 ? <span className="hidden sm:inline">{formatMonthKey(d.key)}</span> : formatMonthKey(d.key)}
          </span>
        ))}
      </div>
    </section>
  );
}
