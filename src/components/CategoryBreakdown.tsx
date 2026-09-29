import { CATEGORY_STYLES, Expense } from "@/lib/types";
import { sumCents, totalsByCategory } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";

/** Horizontal bar chart of spending per category, largest first. */
export function CategoryBreakdown({ expenses }: { expenses: Expense[] }) {
  const total = sumCents(expenses);
  const rows = totalsByCategory(expenses).sort((a, b) => b.cents - a.cents);
  const max = Math.max(...rows.map((r) => r.cents), 1);

  return (
    <section className="card p-5" aria-labelledby="cat-title">
      <h2 id="cat-title" className="text-base font-semibold text-slate-900">Spending by category</h2>
      <p className="text-sm text-slate-500">All time</p>

      <ul className="mt-5 space-y-4">
        {rows.map((r) => {
          const pct = total ? (r.cents / total) * 100 : 0;
          return (
            <li key={r.category} className="group" title={`${r.category}: ${formatCurrency(r.cents)} across ${r.count} expense${r.count === 1 ? "" : "s"}`}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span aria-hidden>{CATEGORY_STYLES[r.category].icon}</span>
                  {r.category}
                </span>
                <span className="tabular-nums text-slate-900">
                  {formatCurrency(r.cents)}
                  <span className="ml-2 inline-block w-10 text-right text-xs text-slate-500">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full transition-[width,opacity] duration-500 group-hover:opacity-80"
                  style={{ width: `${(r.cents / max) * 100}%`, backgroundColor: CATEGORY_STYLES[r.category].color, minWidth: r.cents ? 4 : 0 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
