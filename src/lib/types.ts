export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** ISO calendar date, YYYY-MM-DD (local, no time zone) */
  date: string;
  /** Stored in cents to avoid floating-point drift */
  amountCents: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, "date" | "amountCents" | "category" | "description">;

export interface ExpenseFilters {
  search: string;
  category: Category | "All";
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ExpenseFilters = { search: "", category: "All", from: "", to: "" };

/** Fixed color per category (validated categorical palette, assigned in order). */
export const CATEGORY_STYLES: Record<Category, { color: string; badge: string; icon: string }> = {
  Food: { color: "#2a78d6", badge: "bg-blue-50 text-blue-800 ring-blue-200", icon: "🍽️" },
  Transportation: { color: "#eb6834", badge: "bg-orange-50 text-orange-800 ring-orange-200", icon: "🚗" },
  Entertainment: { color: "#1baf7a", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: "🎬" },
  Shopping: { color: "#eda100", badge: "bg-amber-50 text-amber-800 ring-amber-200", icon: "🛍️" },
  Bills: { color: "#e87ba4", badge: "bg-pink-50 text-pink-800 ring-pink-200", icon: "🧾" },
  Other: { color: "#008300", badge: "bg-green-50 text-green-800 ring-green-200", icon: "📦" },
};

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
