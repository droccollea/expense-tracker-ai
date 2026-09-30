import { describe, expect, it } from "vitest";
import { rankCategories, roundedPercentages } from "./topCategories";
import { CATEGORIES, Category, Expense } from "./types";

let seq = 0;
function exp(category: Category, amountCents: number): Expense {
  seq += 1;
  return {
    id: `e${seq}`,
    date: "2026-09-01",
    amountCents,
    category,
    description: `${category} ${seq}`,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 10) / 10;

describe("rankCategories", () => {
  it("returns no rows and a zero total for empty input", () => {
    expect(rankCategories([])).toEqual({ totalCents: 0, rows: [] });
  });

  it("includes every category at 0% when includeEmpty is set and there is no data", () => {
    const { rows } = rankCategories([], { includeEmpty: true });
    expect(rows.map((r) => r.category)).toEqual([...CATEGORIES]);
    expect(rows.every((r) => r.cents === 0 && r.percent === 0 && r.barPercent === 0 && r.rank === 1)).toBe(true);
  });

  it("ranks categories by total spend with totals, counts and bar widths", () => {
    const { totalCents, rows } = rankCategories([
      exp("Food", 1000),
      exp("Food", 2000),
      exp("Bills", 5000),
      exp("Shopping", 2000),
    ]);
    expect(totalCents).toBe(10000);
    expect(rows).toEqual([
      { rank: 1, category: "Bills", cents: 5000, count: 1, percent: 50, barPercent: 100 },
      { rank: 2, category: "Food", cents: 3000, count: 2, percent: 30, barPercent: 60 },
      { rank: 3, category: "Shopping", cents: 2000, count: 1, percent: 20, barPercent: 40 },
    ]);
  });

  it("omits categories with no expenses by default", () => {
    const { rows } = rankCategories([exp("Other", 100)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rank: 1, category: "Other", percent: 100 });
  });

  it("gives tied totals the same rank and skips the next rank", () => {
    const { rows } = rankCategories([
      exp("Food", 3000),
      exp("Bills", 2000),
      exp("Shopping", 1000),
      exp("Shopping", 1000),
      exp("Transportation", 500),
    ]);
    expect(rows.map((r) => [r.category, r.rank])).toEqual([
      ["Food", 1],
      ["Shopping", 2], // same total as Bills but more transactions, so listed first
      ["Bills", 2],
      ["Transportation", 4],
    ]);
  });

  it("breaks full ties (same total and count) by canonical category order", () => {
    const { rows } = rankCategories([exp("Other", 700), exp("Entertainment", 700), exp("Food", 700)]);
    expect(rows.map((r) => r.category)).toEqual(["Food", "Entertainment", "Other"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 1]);
    expect(sum(rows.map((r) => r.percent))).toBe(100);
  });

  it("produces percentages that sum to exactly 100 even when rounding would drift", () => {
    // Thirds: 33.3 + 33.3 + 33.3 = 99.9 with naive rounding.
    const thirds = rankCategories([exp("Food", 100), exp("Bills", 100), exp("Other", 100)]);
    expect(sum(thirds.rows.map((r) => r.percent))).toBe(100);

    // Six uneven categories.
    const six = rankCategories([
      exp("Food", 1234),
      exp("Transportation", 567),
      exp("Entertainment", 89),
      exp("Shopping", 4321),
      exp("Bills", 999),
      exp("Other", 1),
    ]);
    expect(sum(six.rows.map((r) => r.percent))).toBe(100);
    for (const r of six.rows) {
      expect(Math.abs(r.percent - (r.cents / six.totalCents) * 100)).toBeLessThanOrEqual(0.1);
    }
  });

  it("does not mutate the input", () => {
    const input = [exp("Food", 100), exp("Bills", 200)];
    const snapshot = JSON.parse(JSON.stringify(input));
    rankCategories(input);
    expect(input).toEqual(snapshot);
  });
});

describe("roundedPercentages", () => {
  it("returns zeros when the total is zero", () => {
    expect(roundedPercentages([0, 0])).toEqual([0, 0]);
    expect(roundedPercentages([])).toEqual([]);
  });

  it("sums to 100 at the requested precision", () => {
    expect(roundedPercentages([1, 1, 1], 0)).toEqual([34, 33, 33]);
    expect(sum(roundedPercentages([1, 1, 1, 1, 1, 1, 1]))).toBe(100);
  });
});
