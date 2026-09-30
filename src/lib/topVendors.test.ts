import { describe, expect, it } from "vitest";
import { Expense } from "./types";
import { UNKNOWN_VENDOR, normalizeVendorName, rankVendors, topVendors, vendorKey } from "./topVendors";

let seq = 0;
function exp(description: string, amountCents: number, date = "2026-01-15"): Expense {
  seq += 1;
  return {
    id: `e${seq}`,
    date,
    amountCents,
    category: "Other",
    description,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("normalizeVendorName / vendorKey", () => {
  it("trims and collapses internal whitespace (spaces, tabs, newlines)", () => {
    expect(normalizeVendorName("  Blue   Bottle \t Coffee\n")).toBe("Blue Bottle Coffee");
  });

  it("keeps the original casing for display but lower-cases the key", () => {
    expect(normalizeVendorName("TRADER Joe's")).toBe("TRADER Joe's");
    expect(vendorKey("  TRADER   Joe's ")).toBe("trader joe's");
  });

  it("maps blank and whitespace-only descriptions to an empty key", () => {
    expect(vendorKey("")).toBe("");
    expect(vendorKey("   \t\n ")).toBe("");
  });

  it("applies Unicode NFKC normalization (e.g. non-breaking spaces, full-width letters)", () => {
    expect(vendorKey("Star bucks")).toBe(vendorKey("Star bucks"));
    expect(vendorKey("ＡＢＣ")).toBe("abc");
  });
});

describe("rankVendors", () => {
  it("returns an empty list for no expenses", () => {
    expect(rankVendors([])).toEqual([]);
  });

  it("groups case- and whitespace-variant descriptions into one vendor", () => {
    const ranked = rankVendors([
      exp("Starbucks", 500, "2026-01-01"),
      exp("  starbucks ", 450, "2026-01-03"),
      exp("STARBUCKS", 300, "2026-01-02"),
      exp("Star  bucks", 100, "2026-01-02"),
    ]);
    // "Star bucks" (with a space) is a genuinely different string, so it stays separate.
    expect(ranked).toHaveLength(2);
    const [top, second] = ranked;
    expect(top.key).toBe("starbucks");
    expect(top.cents).toBe(1250);
    expect(top.count).toBe(3);
    expect(top.lastDate).toBe("2026-01-03");
    expect(second.name).toBe("Star bucks");
  });

  it("uses the most common spelling as the canonical display name", () => {
    const [v] = rankVendors([exp("coffee shop", 1), exp("Coffee Shop", 1), exp(" Coffee   Shop ", 1), exp("COFFEE SHOP", 1)]);
    expect(v.name).toBe("Coffee Shop");
  });

  it("breaks spelling-frequency ties by the most recently used spelling", () => {
    const [v] = rankVendors([exp("uber", 1, "2026-01-01"), exp("Uber", 1, "2026-02-01")]);
    expect(v.name).toBe("Uber");
  });

  it("groups blank descriptions under a single unknown vendor", () => {
    const ranked = rankVendors([exp("", 200), exp("   ", 300), exp("Gas", 100)]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ key: "", name: UNKNOWN_VENDOR, isUnknown: true, cents: 500, count: 2 });
    expect(ranked[1]).toMatchObject({ name: "Gas", isUnknown: false });
  });

  it("ranks by total spend and computes shares that sum to 1", () => {
    const ranked = rankVendors([exp("A", 100), exp("B", 300), exp("C", 600)]);
    expect(ranked.map((v) => v.name)).toEqual(["C", "B", "A"]);
    expect(ranked.map((v) => v.share)).toEqual([0.6, 0.3, 0.1]);
    expect(ranked.reduce((s, v) => s + v.share, 0)).toBeCloseTo(1);
  });

  it("breaks total-spend ties by count, then last purchase, then name", () => {
    const ranked = rankVendors([
      // Same total (1000) for all four vendors.
      exp("Zeta", 1000, "2026-01-01"),
      exp("Alpha", 500, "2026-01-01"),
      exp("Alpha", 500, "2026-01-01"), // 2 transactions -> first
      exp("Beta", 1000, "2026-03-01"), // most recent -> ahead of Gamma/Zeta
      exp("Gamma", 1000, "2026-01-01"), // same count & date as Zeta -> alphabetical
    ]);
    expect(ranked.map((v) => v.name)).toEqual(["Alpha", "Beta", "Gamma", "Zeta"]);
  });

  it("is independent of input order", () => {
    const items = [exp("a", 5, "2026-01-02"), exp("B", 5, "2026-01-01"), exp("b", 1, "2026-01-05"), exp("c", 7)];
    const forward = rankVendors(items);
    const reversed = rankVendors([...items].reverse());
    expect(reversed).toEqual(forward);
  });

  it("reports zero shares when overall spend is zero", () => {
    const [v] = rankVendors([exp("Freebie", 0)]);
    expect(v.share).toBe(0);
  });
});

describe("topVendors", () => {
  it("handles empty input", () => {
    expect(topVendors([])).toEqual({ vendors: [], other: null, totalCents: 0, totalCount: 0, vendorCount: 0 });
  });

  it("returns every vendor and no rollup when there are N or fewer", () => {
    const r = topVendors([exp("A", 1), exp("B", 2), exp("C", 3)], 3);
    expect(r.vendors.map((v) => v.name)).toEqual(["C", "B", "A"]);
    expect(r.other).toBeNull();
    expect(r.vendorCount).toBe(3);
  });

  it("keeps the top N and rolls the rest up into 'other'", () => {
    const expenses = [
      exp("V1", 1000),
      exp("V2", 900),
      exp("v2", 100), // grouped with V2 -> 1000 total, 2 txns (beats V1 on count)
      exp("V3", 500),
      exp("V4", 300),
      exp("V5", 200),
      exp("v5 ", 100),
    ];
    const r = topVendors(expenses, 2);
    expect(r.vendors.map((v) => v.key)).toEqual(["v2", "v1"]);
    expect(r.other).toEqual({ vendorCount: 3, cents: 1100, count: 4, share: 1100 / 3100 });
    expect(r.totalCents).toBe(3100);
    expect(r.totalCount).toBe(7);
    expect(r.vendorCount).toBe(5);
    // Top N + other accounts for all spend and all transactions.
    const topCents = r.vendors.reduce((s, v) => s + v.cents, 0);
    const topCount = r.vendors.reduce((s, v) => s + v.count, 0);
    expect(topCents + r.other!.cents).toBe(r.totalCents);
    expect(topCount + r.other!.count).toBe(r.totalCount);
  });

  it("defaults to the top 10", () => {
    const expenses = Array.from({ length: 12 }, (_, i) => exp(`Vendor ${i}`, (i + 1) * 100));
    const r = topVendors(expenses);
    expect(r.vendors).toHaveLength(10);
    expect(r.vendors[0].name).toBe("Vendor 11");
    expect(r.other).toMatchObject({ vendorCount: 2, cents: 300, count: 2 });
  });

  it("treats a non-positive or invalid N as 'everything is other'", () => {
    const expenses = [exp("A", 1), exp("B", 2)];
    for (const n of [0, -3, Number.NaN]) {
      const r = topVendors(expenses, n);
      expect(r.vendors).toEqual([]);
      expect(r.other).toMatchObject({ vendorCount: 2, cents: 3, count: 2, share: 1 });
    }
  });

  it("uses deterministic tie-breaking at the top-N boundary", () => {
    const expenses = [exp("Charlie", 100), exp("alpha", 100), exp("Bravo", 100)];
    const r = topVendors(expenses, 2);
    expect(r.vendors.map((v) => v.name)).toEqual(["alpha", "Bravo"]);
    expect(r.other).toMatchObject({ vendorCount: 1, cents: 100 });
  });
});
