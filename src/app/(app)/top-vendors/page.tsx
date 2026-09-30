"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useExpenses } from "@/hooks/useExpenses";
import { topVendors } from "@/lib/topVendors";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useExpenseDialogs } from "@/components/ExpenseDialogs";
import { PlusIcon } from "@/components/Icons";
import { useToast } from "@/hooks/useToast";

const TOP_N = 10;

function formatShare(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function TopVendorsPage() {
  const { expenses, isLoading, error, loadSampleData } = useExpenses();
  const { openAdd } = useExpenseDialogs();
  const { notify } = useToast();

  const result = useMemo(() => topVendors(expenses, TOP_N), [expenses]);
  const maxCents = Math.max(result.vendors[0]?.cents ?? 0, 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Top vendors</h1>
        <p className="mt-1 text-sm text-slate-500">Where you spend the most, grouped by expense description.</p>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : expenses.length === 0 ? (
        error ? (
          // The StorageErrorBanner above explains the problem and offers Retry / Reset.
          <EmptyState title="Vendors unavailable" description="Your saved expenses couldn't be loaded, so there's nothing to rank yet." />
        ) : (
          <EmptyState title="No expenses yet" description="Add expenses to see which vendors you spend the most with — or load sample data to explore.">
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
        )
      ) : (
        <section className="card overflow-hidden" aria-labelledby="vendors-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 id="vendors-title" className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{plural(result.vendorCount, "vendor")}</span> ·{" "}
              {plural(result.totalCount, "expense")} ·{" "}
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(result.totalCents)}</span> all time
            </h2>
            <Link href="/expenses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View expenses →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Top {TOP_N} vendors ranked by total spend</caption>
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-100">
                  <th scope="col" className="w-10 px-4 py-2 text-right">#</th>
                  <th scope="col" className="px-4 py-2">Vendor</th>
                  <th scope="col" className="px-4 py-2 text-right">Total</th>
                  <th scope="col" className="hidden px-4 py-2 text-right sm:table-cell">Expenses</th>
                  <th scope="col" className="px-4 py-2 text-right">Share</th>
                  <th scope="col" className="hidden px-4 py-2 text-right md:table-cell">Last purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.vendors.map((v, i) => (
                  <tr key={v.key} className="group align-top">
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{i + 1}</td>
                    <td className="min-w-[10rem] px-4 py-3">
                      <div className={`font-medium ${v.isUnknown ? "italic text-slate-500" : "text-slate-800"}`}>{v.name}</div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden>
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-[width,opacity] duration-500 group-hover:opacity-80"
                          style={{ width: `${(v.cents / maxCents) * 100}%`, minWidth: v.cents ? 4 : 0 }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500 sm:hidden">
                        {plural(v.count, "expense")} · last {formatDate(v.lastDate)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">{formatCurrency(v.cents)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">{v.count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{formatShare(v.share)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-600 md:table-cell">{formatDate(v.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
              {result.other && (
                <tfoot className="border-t border-slate-200 bg-slate-50/60">
                  <tr>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">Other</div>
                      <div className="text-xs text-slate-500">
                        {plural(result.other.vendorCount, "more vendor")}
                        <span className="sm:hidden"> · {plural(result.other.count, "expense")}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">{formatCurrency(result.other.cents)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">{result.other.count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{formatShare(result.other.share)}</td>
                    <td className="hidden px-4 py-3 md:table-cell" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Vendors are grouped from each expense&apos;s description, ignoring capitalization and extra spaces.
          </p>
        </section>
      )}
    </div>
  );
}
