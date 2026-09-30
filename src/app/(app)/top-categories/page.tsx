"use client";

import { useMemo } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { rankCategories } from "@/lib/topCategories";
import { CATEGORY_STYLES } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useExpenseDialogs } from "@/components/ExpenseDialogs";
import { PlusIcon } from "@/components/Icons";
import { useToast } from "@/hooks/useToast";

export default function TopCategoriesPage() {
  const { expenses, isLoading, loadSampleData } = useExpenses();
  const { openAdd } = useExpenseDialogs();
  const { notify } = useToast();
  const { totalCents, rows } = useMemo(() => rankCategories(expenses), [expenses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Top categories</h1>
        <p className="mt-1 text-sm text-slate-500">Your spending categories ranked by total, all time.</p>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses yet" description="Add expenses to see which categories you spend the most on — or load sample data to explore.">
          <button onClick={openAdd} className="btn-primary">
            <PlusIcon width={16} height={16} /> Add expense
          </button>
          <button
            onClick={() => {
              loadSampleData();
              notify("Loaded 6 months of sample data.", "info");
            }}
            className="btn-secondary"
          >
            Load sample data
          </button>
        </EmptyState>
      ) : (
        <section className="card overflow-hidden" aria-labelledby="top-cat-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 id="top-cat-title" className="text-base font-semibold text-slate-900">Ranking</h2>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{rows.length}</span> categor{rows.length === 1 ? "y" : "ies"} ·{" "}
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(totalCents)}</span> total
            </p>
          </div>
          <ol className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.category} className="flex items-center gap-4 px-4 py-4">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold tabular-nums text-slate-700"
                  aria-label={`Rank ${r.rank}`}
                >
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{CATEGORY_STYLES[r.category].icon}</span>
                      <CategoryBadge category={r.category} />
                      <span className="text-xs text-slate-500">
                        {r.count} transaction{r.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums text-slate-900">
                      <span className="font-semibold">{formatCurrency(r.cents)}</span>
                      <span className="ml-2 inline-block w-12 text-right text-xs text-slate-500">{r.percent.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${r.category} share of spending`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={r.percent}
                  >
                    <div
                      className="h-2 rounded-full transition-[width] duration-500"
                      style={{ width: `${r.barPercent}%`, backgroundColor: CATEGORY_STYLES[r.category].color, minWidth: r.cents ? 4 : 0 }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
