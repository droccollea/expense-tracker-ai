import { CATEGORIES, Category, Expense } from "./types";
import { sumCents, totalsByCategory } from "./analytics";

export interface RankedCategory {
  /** 1-based rank. Categories with identical totals share a rank (1, 2, 2, 4). */
  rank: number;
  category: Category;
  cents: number;
  count: number;
  /** Share of overall spend in percent, rounded to one decimal. Sums to exactly 100 across rows when total > 0. */
  percent: number;
  /** Share of the largest category's total (0–100), for sizing bars. */
  barPercent: number;
}

export interface CategoryRanking {
  totalCents: number;
  rows: RankedCategory[];
}

/**
 * Split 100% across `values` in steps of 1/10^decimals, using the largest-remainder method
 * so the rounded parts always add up to exactly 100.
 */
export function roundedPercentages(values: number[], decimals = 1): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);
  const scale = 10 ** decimals;
  const units = 100 * scale;
  const raw = values.map((v) => (v / total) * units);
  const floors = raw.map(Math.floor);
  let remaining = units - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r - floors[i] }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors.map((u) => u / scale);
}

/**
 * Rank categories by total spend, largest first. Categories with no expenses are omitted
 * unless `includeEmpty` is set. Ties on amount are ordered by transaction count (desc), then by
 * the canonical CATEGORIES order, and share the same rank.
 */
export function rankCategories(expenses: Expense[], { includeEmpty = false }: { includeEmpty?: boolean } = {}): CategoryRanking {
  const totalCents = sumCents(expenses);
  const sorted = totalsByCategory(expenses)
    .filter((t) => includeEmpty || t.count > 0)
    .sort(
      (a, b) =>
        b.cents - a.cents || b.count - a.count || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
    );

  const max = sorted.length ? Math.max(sorted[0].cents, 0) : 0;
  const percents = roundedPercentages(sorted.map((t) => t.cents));

  const rows: RankedCategory[] = [];
  sorted.forEach((t, i) => {
    const rank = i > 0 && t.cents === sorted[i - 1].cents ? rows[i - 1].rank : i + 1;
    rows.push({
      rank,
      category: t.category,
      cents: t.cents,
      count: t.count,
      percent: percents[i],
      barPercent: max > 0 ? (t.cents / max) * 100 : 0,
    });
  });

  return { totalCents, rows };
}
