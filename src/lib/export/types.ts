import type { Category, Expense } from "../types";

export type ExportFormatId = "csv" | "json" | "pdf";

export const EXPORT_COLUMNS = ["date", "category", "amount", "description"] as const;
export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

export const COLUMN_LABELS: Record<ExportColumn, string> = {
  date: "Date",
  category: "Category",
  amount: "Amount",
  description: "Description",
};

export type SortOrder = "date-desc" | "date-asc" | "amount-desc";

export interface ExportOptions {
  format: ExportFormatId;
  from: string;
  to: string;
  categories: Category[];
  columns: ExportColumn[];
  sort: SortOrder;
  filename: string;
}

export interface ExportSummary {
  count: number;
  totalCents: number;
  firstDate: string | null;
  lastDate: string | null;
  byCategory: { category: Category; count: number; cents: number }[];
}

/** Everything an exporter needs; exporters are pure functions of this. */
export interface ExportPayload {
  rows: Expense[];
  options: ExportOptions;
  summary: ExportSummary;
  generatedAt: Date;
}

export interface Exporter {
  id: ExportFormatId;
  label: string;
  description: string;
  extension: string;
  mimeType: string;
  /** Whether the user's column selection applies (JSON always exports full records). */
  supportsColumns: boolean;
  build: (payload: ExportPayload) => Promise<Blob>;
}
