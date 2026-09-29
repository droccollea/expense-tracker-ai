import { CATEGORIES, type Expense } from "../types";
import type { ExportOptions, ExportSummary } from "./types";

export function selectForExport(expenses: Expense[], o: Pick<ExportOptions, "from" | "to" | "categories" | "sort">): Expense[] {
  const cats = new Set(o.categories);
  const rows = expenses.filter(
    (e) => cats.has(e.category) && (!o.from || e.date >= o.from) && (!o.to || e.date <= o.to),
  );
  const byDate = (a: Expense, b: Expense) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
  switch (o.sort) {
    case "date-asc":
      return rows.sort(byDate);
    case "amount-desc":
      return rows.sort((a, b) => b.amountCents - a.amountCents || byDate(b, a));
    default:
      return rows.sort((a, b) => byDate(b, a));
  }
}

export function summarize(rows: Expense[]): ExportSummary {
  let totalCents = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  const map = new Map(CATEGORIES.map((c) => [c, { category: c, count: 0, cents: 0 }]));
  for (const e of rows) {
    totalCents += e.amountCents;
    if (!firstDate || e.date < firstDate) firstDate = e.date;
    if (!lastDate || e.date > lastDate) lastDate = e.date;
    const bucket = map.get(e.category)!;
    bucket.count++;
    bucket.cents += e.amountCents;
  }
  return {
    count: rows.length,
    totalCents,
    firstDate,
    lastDate,
    byCategory: [...map.values()].filter((b) => b.count > 0).sort((a, b) => b.cents - a.cents),
  };
}
