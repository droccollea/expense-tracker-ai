import type { Expense } from "../types";
import { formatCurrency, formatDate } from "../format";
import type { ExportColumn } from "./types";

/** Machine-friendly cell values (CSV). */
export function rawCell(e: Expense, col: ExportColumn): string {
  switch (col) {
    case "date":
      return e.date;
    case "category":
      return e.category;
    case "amount":
      return (e.amountCents / 100).toFixed(2);
    case "description":
      return e.description;
  }
}

/** Human-friendly cell values (preview, PDF). */
export function displayCell(e: Expense, col: ExportColumn): string {
  switch (col) {
    case "date":
      return formatDate(e.date);
    case "amount":
      return formatCurrency(e.amountCents);
    default:
      return rawCell(e, col);
  }
}
