import { COLUMN_LABELS, type Exporter } from "../types";
import { rawCell } from "../cells";

function escape(value: string): string {
  // Neutralise spreadsheet formula injection, then apply RFC 4180 quoting.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const csvExporter: Exporter = {
  id: "csv",
  label: "CSV",
  description: "Spreadsheet-ready. Opens in Excel, Numbers, Google Sheets.",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  supportsColumns: true,
  async build({ rows, options }) {
    const cols = options.columns;
    const lines = [cols.map((c) => escape(COLUMN_LABELS[c])).join(",")];
    for (const e of rows) lines.push(cols.map((c) => escape(rawCell(e, c))).join(","));
    // BOM so Excel detects UTF-8.
    return new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: this.mimeType });
  },
};
