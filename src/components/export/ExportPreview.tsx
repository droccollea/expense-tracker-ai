"use client";

import { useEffect, useState } from "react";
import type { Expense } from "@/lib/types";
import { COLUMN_LABELS, EXPORTERS, EXPORT_COLUMNS, summarize } from "@/lib/export";
import type { ExportState } from "@/hooks/useExportOptions";
import { displayCell } from "@/lib/export/cells";
import { CategoryBadge } from "../CategoryBadge";

const TABLE_LIMIT = 100;
const RAW_LIMIT = 12;

export function ExportPreview({ rows, state }: { rows: Expense[]; state: ExportState }) {
  const [tab, setTab] = useState<"table" | "raw">("table");
  const exporter = EXPORTERS[state.format];
  const canRaw = state.format !== "pdf";
  const columns = exporter.supportsColumns ? state.columns : [...EXPORT_COLUMNS];
  const activeTab = canRaw ? tab : "table";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="tablist">
          <TabButton selected={activeTab === "table"} onClick={() => setTab("table")}>
            Table
          </TabButton>
          <TabButton selected={activeTab === "raw"} onClick={() => setTab("raw")} disabled={!canRaw} title={canRaw ? undefined : "Raw preview isn't available for PDF"}>
            Raw {exporter.label}
          </TabButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="grid h-full min-h-48 place-items-center p-8 text-center">
            <div>
              <p className="text-sm font-medium text-slate-700">No records match these options</p>
              <p className="mt-1 text-xs text-slate-500">Widen the date range or select more categories.</p>
            </div>
          </div>
        ) : activeTab === "table" ? (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c} scope="col" className={`border-b border-slate-200 px-3 py-2 font-medium ${c === "amount" ? "text-right" : ""}`}>
                      {COLUMN_LABELS[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, TABLE_LIMIT).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c} className={`whitespace-nowrap px-3 py-2 ${c === "amount" ? "text-right font-medium tabular-nums text-slate-900" : c === "description" ? "max-w-[16rem] truncate text-slate-700" : "text-slate-600"}`}>
                        {c === "category" ? <CategoryBadge category={e.category} /> : displayCell(e, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > TABLE_LIMIT && (
              <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                Showing first {TABLE_LIMIT} of {rows.length.toLocaleString()} records — all will be exported.
              </p>
            )}
          </div>
        ) : (
          <RawPreview rows={rows} state={state} />
        )}
      </div>
    </div>
  );
}

/** Renders the real exporter output for the first few rows, so the preview is exactly what's written. */
function RawPreview({ rows, state }: { rows: Expense[]; state: ExportState }) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    const sample = rows.slice(0, RAW_LIMIT);
    EXPORTERS[state.format]
      .build({ rows: sample, options: state, summary: summarize(rows), generatedAt: new Date() })
      .then((b) => b.text())
      .then((t) => !cancelled && setText(t.replace(/^﻿/, "")));
    return () => {
      cancelled = true;
    };
  }, [rows, state]);

  return (
    <div className="h-full overflow-auto bg-slate-950">
      <pre className="p-4 font-mono text-xs leading-relaxed text-slate-200">{text}</pre>
      {rows.length > RAW_LIMIT && <p className="px-4 pb-4 font-mono text-xs text-slate-500">… {rows.length - RAW_LIMIT} more records</p>}
    </div>
  );
}

function TabButton({ selected, disabled, title, onClick, children }: { selected: boolean; disabled?: boolean; title?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
    >
      {children}
    </button>
  );
}
