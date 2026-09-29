import { CATEGORIES, Category, Expense, ExpenseFilters } from "./types";
import { monthKey, toISODate } from "./format";

export function filterExpenses(expenses: Expense[], f: ExpenseFilters): Expense[] {
  const q = f.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (f.category !== "All" && e.category !== f.category) return false;
    if (f.from && e.date < f.from) return false;
    if (f.to && e.date > f.to) return false;
    if (q && !e.description.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function sumCents(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amountCents, 0);
}

export function totalsByCategory(expenses: Expense[]): { category: Category; cents: number; count: number }[] {
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    return { category, cents: sumCents(items), count: items.length };
  });
}

/** Totals for the last `n` calendar months, oldest first, including empty months. */
export function monthlyTotals(expenses: Expense[], n = 6, now = new Date()): { key: string; cents: number }[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - i, 1))));
  }
  const map = new Map(keys.map((k) => [k, 0]));
  for (const e of expenses) {
    const k = monthKey(e.date);
    if (map.has(k)) map.set(k, map.get(k)! + e.amountCents);
  }
  return keys.map((key) => ({ key, cents: map.get(key)! }));
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(toISODate(now));
}

export function previousMonthKey(now = new Date()): string {
  return monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
}
