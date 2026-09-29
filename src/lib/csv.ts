import { Expense } from "./types";
import { todayISO } from "./format";

function escapeCell(value: string): string {
  // Guard against CSV/formula injection in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) => [e.date, e.category, (e.amountCents / 100).toFixed(2), e.description]);
  return [header, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCSV(expenses: Expense[], filename = `expenses-${todayISO()}.csv`): void {
  const blob = new Blob(["﻿" + expensesToCSV(expenses)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
