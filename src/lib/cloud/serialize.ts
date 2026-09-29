import type { Dataset, FileFormat } from "./types";

function csvCell(value: string | number): string {
  const s = String(value);
  // Neutralise spreadsheet formula injection, then RFC 4180 quoting.
  // Signed numbers/percentages like "+12%" or "-4.50" are data, not formulas.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?%?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function serialize(ds: Dataset, format: FileFormat, generatedAt: Date): { content: string; mime: string; extension: string } {
  if (format === "json") {
    const doc = {
      report: ds.title,
      period: ds.subtitle,
      generatedAt: generatedAt.toISOString(),
      records: ds.recordCount,
      total: ds.totalCents / 100,
      currency: "USD",
      rows: ds.rows,
    };
    return { content: JSON.stringify(doc, null, 2), mime: "application/json", extension: "json" };
  }
  const lines = [ds.columns.map((c) => csvCell(c.label)).join(",")];
  for (const r of ds.rows) lines.push(ds.columns.map((c) => csvCell(r[c.key] ?? "")).join(","));
  return { content: "﻿" + lines.join("\r\n") + "\r\n", mime: "text/csv;charset=utf-8", extension: "csv" };
}

export function fileNameFor(ds: Dataset, extension: string): string {
  const base = (ds.fileBase ?? `${ds.title} - ${ds.subtitle}`).replace(/[<>:"/\\|?*\u0000-\u001f·]/g, "").replace(/\s+/g, " ").trim();
  return `${base}.${extension}`;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
