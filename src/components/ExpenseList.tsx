"use client";

import { CATEGORY_STYLES, Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";
import { EditIcon, TrashIcon } from "./Icons";
import { useExpenseDialogs } from "./ExpenseDialogs";

export function ExpenseList({ expenses, compact = false }: { expenses: Expense[]; compact?: boolean }) {
  const { openEdit, confirmDelete } = useExpenseDialogs();

  return (
    <ul className="divide-y divide-slate-100">
      {expenses.map((e) => (
        <li key={e.id} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70 sm:gap-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
            style={{ backgroundColor: `${CATEGORY_STYLES[e.category].color}1a` }}
            aria-hidden
          >
            {CATEGORY_STYLES[e.category].icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <time dateTime={e.date}>{formatDate(e.date)}</time>
              {!compact && <CategoryBadge category={e.category} />}
              {compact && <span>· {e.category}</span>}
            </div>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(e.amountCents)}</p>
          {!compact && (
            <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button onClick={() => openEdit(e)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${e.description}`}>
                <EditIcon width={16} height={16} />
              </button>
              <button onClick={() => confirmDelete(e)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${e.description}`}>
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
