import { Expense, isCategory } from "./types";
import { isValidISODate } from "./format";

const STORAGE_KEY = "expense-tracker:v1";

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    isValidISODate(e.date) &&
    typeof e.amountCents === "number" &&
    Number.isInteger(e.amountCents) &&
    isCategory(e.category) &&
    typeof e.description === "string"
  );
}

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Stored expense data is malformed.");
  return parsed.filter(isExpense);
}

export function saveExpenses(expenses: Expense[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
