import type { ReactNode } from "react";
import { Expense } from "@/lib/types";
import { currentMonthKey, previousMonthKey, sumCents, totalsByCategory } from "@/lib/analytics";
import { formatCurrency, formatMonthKey, monthKey } from "@/lib/format";
import { CalendarIcon, TagIcon, TrendIcon, WalletIcon } from "./Icons";

export function SummaryCards({ expenses }: { expenses: Expense[] }) {
  const total = sumCents(expenses);
  const thisKey = currentMonthKey();
  const lastKey = previousMonthKey();
  const thisMonth = sumCents(expenses.filter((e) => monthKey(e.date) === thisKey));
  const lastMonth = sumCents(expenses.filter((e) => monthKey(e.date) === lastKey));
  const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const months = new Set(expenses.map((e) => monthKey(e.date))).size || 1;
  const avgMonthly = Math.round(total / months);

  const top = totalsByCategory(expenses)
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents)[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total spending" value={formatCurrency(total)} icon={<WalletIcon />} footer={`${expenses.length} expense${expenses.length === 1 ? "" : "s"} recorded`} />
      <StatCard
        label={`This month · ${formatMonthKey(thisKey, "long")}`}
        value={formatCurrency(thisMonth)}
        icon={<CalendarIcon />}
        footer={
          change === null ? (
            "No spending last month to compare"
          ) : (
            <span>
              <span className={change > 0 ? "font-medium text-red-700" : "font-medium text-emerald-700"}>
                {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
              </span>{" "}
              vs. {formatMonthKey(lastKey, "long")}
            </span>
          )
        }
      />
      <StatCard label="Monthly average" value={formatCurrency(avgMonthly)} icon={<TrendIcon />} footer={`Across ${months} month${months === 1 ? "" : "s"} with activity`} />
      <StatCard
        label="Top category"
        value={top ? top.category : "—"}
        icon={<TagIcon />}
        footer={top ? `${formatCurrency(top.cents)} · ${((top.cents / total) * 100).toFixed(0)}% of total` : "No expenses yet"}
      />
    </div>
  );
}

function StatCard({ label, value, icon, footer }: { label: string; value: string; icon: ReactNode; footer: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">{icon}</span>
      </div>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{footer}</p>
    </div>
  );
}
