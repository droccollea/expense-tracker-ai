"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { EMPTY_FILTERS, ExpenseFilters } from "@/lib/types";
import { filterExpenses, sortByDateDesc, sumCents } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { FiltersBar } from "@/components/FiltersBar";
import { ExpenseList } from "@/components/ExpenseList";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { DownloadIcon, PlusIcon } from "@/components/Icons";
import { useExpenseDialogs } from "@/components/ExpenseDialogs";

type Sort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
const PAGE_SIZE = 25;

export default function ExpensesPage() {
  const { expenses, isLoading } = useExpenses();
  const { openAdd } = useExpenseDialogs();
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("date-desc");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredFilters = useDeferredValue(filters);

  const visible = useMemo(() => {
    const filtered = filterExpenses(expenses, deferredFilters);
    const byDate = sortByDateDesc(filtered);
    switch (sort) {
      case "date-asc":
        return byDate.reverse();
      case "amount-desc":
        return byDate.sort((a, b) => b.amountCents - a.amountCents);
      case "amount-asc":
        return byDate.sort((a, b) => a.amountCents - b.amountCents);
      default:
        return byDate;
    }
  }, [expenses, deferredFilters, sort]);

  const total = sumCents(visible);
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter, edit and export your expenses.</p>
        </div>
        <Link href="/exports" className="btn-secondary">
          <DownloadIcon width={16} height={16} /> Export &amp; share
        </Link>
      </div>

      <FiltersBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setLimit(PAGE_SIZE);
        }}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses yet" description="Start tracking by adding your first expense.">
          <button onClick={openAdd} className="btn-primary">
            <PlusIcon width={16} height={16} /> Add expense
          </button>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="No matching expenses" description="Try a different search term, category, or date range.">
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="btn-secondary">
            Clear filters
          </button>
        </EmptyState>
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{visible.length}</span> {isFiltered ? "matching " : ""}expense{visible.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</span>
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </label>
          </div>
          <ExpenseList expenses={visible.slice(0, limit)} />
          {visible.length > limit && (
            <div className="border-t border-slate-100 p-3 text-center">
              <button onClick={() => setLimit((l) => l + PAGE_SIZE)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Show more ({visible.length - limit} remaining)
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
