import { CATEGORIES, type Category, type Expense } from "../types";
import { formatCurrency, monthKey, toISODate } from "../format";
import { periodLabel, periodRange } from "./period";
import type { Dataset, FileFormat, PeriodId, TemplateId } from "./types";

export interface Template {
  id: TemplateId;
  name: string;
  tagline: string;
  audience: string;
  icon: string;
  accent: string;
  defaultPeriod: PeriodId;
  periods: PeriodId[];
  defaultFormat: FileFormat;
  build: (expenses: Expense[], period: PeriodId) => Dataset;
}

const money = (cents: number) => (cents / 100).toFixed(2);
const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

export function inPeriod(expenses: Expense[], period: PeriodId): Expense[] {
  const { from, to } = periodRange(period);
  return expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
}

function groupByCategory(expenses: Expense[]) {
  const map = new Map<Category, Expense[]>(CATEGORIES.map((c) => [c, []]));
  for (const e of expenses) map.get(e.category)!.push(e);
  return map;
}

const sum = (xs: Expense[]) => xs.reduce((s, e) => s + e.amountCents, 0);

export const TEMPLATES: Record<TemplateId, Template> = {
  "monthly-summary": {
    id: "monthly-summary",
    name: "Monthly Summary",
    tagline: "Category totals for one month, with month-over-month change.",
    audience: "For you or a partner",
    icon: "📅",
    accent: "from-sky-500 to-blue-600",
    defaultPeriod: "this-month",
    periods: ["this-month", "last-month"],
    defaultFormat: "csv",
    build(expenses, period) {
      const rows = inPeriod(expenses, period);
      const [y, m] = periodRange(period).from!.split("-").map(Number);
      const prevKey = monthKey(toISODate(new Date(y, m - 2, 1)));
      const prev = expenses.filter((e) => monthKey(e.date) === prevKey);
      const total = sum(rows);
      const cur = groupByCategory(rows);
      const old = groupByCategory(prev);
      return {
        title: "Monthly Summary",
        subtitle: periodLabel(period),
        columns: [
          { key: "category", label: "Category" },
          { key: "transactions", label: "Transactions", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "share", label: "Share", align: "right" },
          { key: "change", label: "vs. prior month", align: "right" },
        ],
        rows: CATEGORIES.map((c) => {
          const now = sum(cur.get(c)!);
          const before = sum(old.get(c)!);
          return {
            category: c,
            transactions: cur.get(c)!.length,
            total: money(now),
            share: pct(now, total),
            change: before ? `${now >= before ? "+" : ""}${(((now - before) / before) * 100).toFixed(0)}%` : now ? "new" : "—",
          };
        }).sort((a, b) => Number(b.total) - Number(a.total)),
        recordCount: rows.length,
        totalCents: total,
      };
    },
  },
  "tax-report": {
    id: "tax-report",
    name: "Tax Report",
    tagline: "Every transaction grouped by category with subtotals.",
    audience: "For your accountant",
    icon: "🧾",
    accent: "from-emerald-500 to-teal-600",
    defaultPeriod: "this-year",
    periods: ["this-year", "last-year", "all"],
    defaultFormat: "csv",
    build(expenses, period) {
      const rows = inPeriod(expenses, period);
      const out: Dataset["rows"] = [];
      for (const [category, items] of groupByCategory(rows)) {
        if (!items.length) continue;
        items.sort((a, b) => a.date.localeCompare(b.date));
        for (const e of items) out.push({ date: e.date, category, description: e.description, amount: money(e.amountCents) });
        out.push({ date: "", category: `${category} subtotal`, description: `${items.length} transactions`, amount: money(sum(items)) });
      }
      const total = sum(rows);
      if (rows.length) out.push({ date: "", category: "TOTAL", description: `${rows.length} transactions`, amount: money(total) });
      return {
        title: "Tax Report",
        subtitle: periodLabel(period),
        columns: [
          { key: "date", label: "Date" },
          { key: "category", label: "Category" },
          { key: "description", label: "Description" },
          { key: "amount", label: "Amount", align: "right" },
        ],
        rows: out,
        recordCount: rows.length,
        totalCents: total,
      };
    },
  },
  "category-analysis": {
    id: "category-analysis",
    name: "Category Analysis",
    tagline: "Averages, largest purchases and monthly run-rate per category.",
    audience: "For budgeting",
    icon: "📊",
    accent: "from-violet-500 to-fuchsia-600",
    defaultPeriod: "last-6-months",
    periods: ["last-3-months", "last-6-months", "this-year", "all"],
    defaultFormat: "csv",
    build(expenses, period) {
      const rows = inPeriod(expenses, period);
      const total = sum(rows);
      const months = Math.max(1, new Set(rows.map((e) => monthKey(e.date))).size);
      return {
        title: "Category Analysis",
        subtitle: periodLabel(period),
        columns: [
          { key: "category", label: "Category" },
          { key: "transactions", label: "Transactions", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "average", label: "Average", align: "right" },
          { key: "largest", label: "Largest", align: "right" },
          { key: "monthly", label: "Per month", align: "right" },
          { key: "share", label: "Share", align: "right" },
        ],
        rows: [...groupByCategory(rows)]
          .map(([category, items]) => {
            const t = sum(items);
            return {
              category,
              transactions: items.length,
              total: money(t),
              average: money(items.length ? Math.round(t / items.length) : 0),
              largest: money(Math.max(0, ...items.map((e) => e.amountCents))),
              monthly: money(Math.round(t / months)),
              share: pct(t, total),
            };
          })
          .sort((a, b) => Number(b.total) - Number(a.total)),
        recordCount: rows.length,
        totalCents: total,
      };
    },
  },
  "full-backup": {
    id: "full-backup",
    name: "Full Backup",
    tagline: "Every expense with all fields — restorable, lossless.",
    audience: "For safekeeping",
    icon: "🛟",
    accent: "from-slate-600 to-slate-900",
    defaultPeriod: "all",
    periods: ["all"],
    defaultFormat: "json",
    build(expenses) {
      const rows = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
      return {
        title: "Full Backup",
        subtitle: `${rows.length} expenses · ${formatCurrency(sum(rows))}`,
        fileBase: `Ledgerly backup ${toISODate(new Date())}`,
        columns: [
          { key: "id", label: "ID" },
          { key: "date", label: "Date" },
          { key: "category", label: "Category" },
          { key: "description", label: "Description" },
          { key: "amount", label: "Amount", align: "right" },
          { key: "createdAt", label: "Created" },
          { key: "updatedAt", label: "Updated" },
        ],
        rows: rows.map((e) => ({
          id: e.id,
          date: e.date,
          category: e.category,
          description: e.description,
          amount: money(e.amountCents),
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        recordCount: rows.length,
        totalCents: sum(rows),
      };
    },
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
