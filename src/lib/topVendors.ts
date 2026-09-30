import { Expense } from "./types";

/**
 * Vendor analytics derived from free-text expense descriptions.
 *
 * Expenses have no vendor field, so a vendor is inferred from `description`:
 * the text is trimmed, internal whitespace is collapsed, and descriptions are
 * grouped case-insensitively. Everything here is pure (no storage, no React).
 */

/** Display name used for expenses whose description is empty or whitespace only. */
export const UNKNOWN_VENDOR = "No description";

/** Trim, collapse runs of whitespace to a single space, and apply Unicode NFKC normalization. */
export function normalizeVendorName(description: string): string {
  return (description ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Grouping key for a description: normalized and lower-cased. Blank descriptions map to "". */
export function vendorKey(description: string): string {
  return normalizeVendorName(description).toLowerCase();
}

export interface VendorStat {
  /** Case-insensitive grouping key ("" for blank descriptions). */
  key: string;
  /** Canonical display name (the most common spelling seen for this vendor). */
  name: string;
  /** True when this row groups expenses with a blank description. */
  isUnknown: boolean;
  cents: number;
  count: number;
  /** Fraction of overall spend, 0..1 (0 when overall spend is 0). */
  share: number;
  /** Most recent expense date for this vendor (YYYY-MM-DD). */
  lastDate: string;
}

export interface VendorRollup {
  /** Number of distinct vendors folded into this rollup. */
  vendorCount: number;
  cents: number;
  count: number;
  share: number;
}

export interface TopVendorsResult {
  /** The top N vendors, ranked. */
  vendors: VendorStat[];
  /** Everything outside the top N, or null when nothing was left over. */
  other: VendorRollup | null;
  totalCents: number;
  totalCount: number;
  /** Number of distinct vendors overall. */
  vendorCount: number;
}

interface Group {
  key: string;
  cents: number;
  count: number;
  lastDate: string;
  /** spelling -> { occurrences, most recent date that spelling was used } */
  spellings: Map<string, { n: number; lastDate: string }>;
}

/** Most frequent spelling wins; ties go to the most recently used, then alphabetical order. */
function canonicalName(spellings: Group["spellings"]): string {
  let best = "";
  let bestN = -1;
  let bestDate = "";
  for (const [name, { n, lastDate }] of spellings) {
    if (
      n > bestN ||
      (n === bestN && lastDate > bestDate) ||
      (n === bestN && lastDate === bestDate && name < best)
    ) {
      best = name;
      bestN = n;
      bestDate = lastDate;
    }
  }
  return best;
}

/**
 * Deterministic ranking order: total spend desc, then transaction count desc,
 * then most recent purchase desc, then grouping key asc.
 */
export function compareVendors(a: VendorStat, b: VendorStat): number {
  return (
    b.cents - a.cents ||
    b.count - a.count ||
    b.lastDate.localeCompare(a.lastDate) ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}

/** Group expenses by normalized vendor and rank every vendor by total spend. */
export function rankVendors(expenses: readonly Expense[]): VendorStat[] {
  const groups = new Map<string, Group>();
  let total = 0;

  for (const e of expenses) {
    const name = normalizeVendorName(e.description);
    const key = name.toLowerCase();
    total += e.amountCents;

    let g = groups.get(key);
    if (!g) {
      g = { key, cents: 0, count: 0, lastDate: "", spellings: new Map() };
      groups.set(key, g);
    }
    g.cents += e.amountCents;
    g.count += 1;
    if (e.date > g.lastDate) g.lastDate = e.date;

    const s = g.spellings.get(name);
    if (s) {
      s.n += 1;
      if (e.date > s.lastDate) s.lastDate = e.date;
    } else {
      g.spellings.set(name, { n: 1, lastDate: e.date });
    }
  }

  return Array.from(groups.values(), (g): VendorStat => {
    const isUnknown = g.key === "";
    return {
      key: g.key,
      name: isUnknown ? UNKNOWN_VENDOR : canonicalName(g.spellings),
      isUnknown,
      cents: g.cents,
      count: g.count,
      share: total > 0 ? g.cents / total : 0,
      lastDate: g.lastDate,
    };
  }).sort(compareVendors);
}

/** Top `n` vendors by spend, with everything else rolled up into `other`. */
export function topVendors(expenses: readonly Expense[], n = 10): TopVendorsResult {
  const ranked = rankVendors(expenses);
  const limit = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const vendors = ranked.slice(0, limit);
  const rest = ranked.slice(limit);

  const totalCents = ranked.reduce((s, v) => s + v.cents, 0);
  const totalCount = ranked.reduce((s, v) => s + v.count, 0);

  let other: VendorRollup | null = null;
  if (rest.length > 0) {
    const cents = rest.reduce((s, v) => s + v.cents, 0);
    other = {
      vendorCount: rest.length,
      cents,
      count: rest.reduce((s, v) => s + v.count, 0),
      share: totalCents > 0 ? cents / totalCents : 0,
    };
  }

  return { vendors, other, totalCents, totalCount, vendorCount: ranked.length };
}
