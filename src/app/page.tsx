"use client";

import Link from "next/link";
import { useExpenses } from "@/hooks/useExpenses";
import { sortByDateDesc } from "@/lib/analytics";
import { SummaryCards } from "@/components/SummaryCards";
import { MonthlyTrend } from "@/components/MonthlyTrend";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { ExpenseList } from "@/components/ExpenseList";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useExpenseDialogs } from "@/components/ExpenseDialogs";
import { PlusIcon } from "@/components/Icons";
import { useToast } from "@/hooks/useToast";

export default function DashboardPage() {
  const { expenses, isLoading, loadSampleData } = useExpenses();
  const { openAdd } = useExpenseDialogs();
  const { notify } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">An overview of where your money goes.</p>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses yet" description="Add your first expense to see spending summaries and charts — or load sample data to explore.">
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
        <>
          <SummaryCards expenses={expenses} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MonthlyTrend expenses={expenses} />
            </div>
            <div className="lg:col-span-2">
              <CategoryBreakdown expenses={expenses} />
            </div>
          </div>
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Recent expenses</h2>
              <Link href="/expenses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            <ExpenseList expenses={sortByDateDesc(expenses).slice(0, 5)} compact />
          </section>
        </>
      )}
    </div>
  );
}
