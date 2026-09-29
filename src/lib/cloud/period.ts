import { toISODate, formatMonthKey, monthKey } from "../format";
import type { PeriodId } from "./types";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "last-6-months", label: "Last 6 months" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
  { id: "all", label: "All time" },
];

export function periodRange(id: PeriodId, now = new Date()): { from: string | null; to: string | null } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toISODate(now);
  switch (id) {
    case "this-month":
      return { from: toISODate(new Date(y, m, 1)), to: today };
    case "last-month":
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case "last-3-months":
      return { from: toISODate(new Date(y, m - 2, 1)), to: today };
    case "last-6-months":
      return { from: toISODate(new Date(y, m - 5, 1)), to: today };
    case "this-year":
      return { from: `${y}-01-01`, to: today };
    case "last-year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "all":
      return { from: null, to: null };
  }
}

/** Human label that names the concrete dates, e.g. "September 2026" or "2025". */
export function periodLabel(id: PeriodId, now = new Date()): string {
  const { from } = periodRange(id, now);
  switch (id) {
    case "this-month":
    case "last-month":
      return formatMonthKey(monthKey(from!), "long");
    case "this-year":
      return `${now.getFullYear()} year to date`;
    case "last-year":
      return String(now.getFullYear() - 1);
    default:
      return PERIODS.find((p) => p.id === id)!.label;
  }
}
