"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import type { Expense } from "@/lib/types";
import { EXPORTERS, runExport, sanitizeFilename, selectForExport, summarize } from "@/lib/export";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExportAction, ExportSeed, ExportState } from "@/hooks/useExportOptions";
import { useToast } from "@/hooks/useToast";
import { DownloadIcon, XIcon } from "../Icons";
import { ExportOptionsPanel } from "./ExportOptionsPanel";
import { ExportPreview } from "./ExportPreview";

type Status = { kind: "idle" } | { kind: "working"; label: string } | { kind: "done"; filename: string } | { kind: "error"; message: string };

interface Props {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  state: ExportState;
  dispatch: Dispatch<ExportAction>;
  reset: (seed?: ExportSeed) => void;
}

export function ExportDrawer({ open, onClose, expenses, state, dispatch }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { notify } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const busy = status.kind === "working" || status.kind === "done";
  const exporter = EXPORTERS[state.format];

  const rowsInRange = useMemo(
    () => expenses.filter((e) => (!state.from || e.date >= state.from) && (!state.to || e.date <= state.to)),
    [expenses, state.from, state.to],
  );
  const rows = useMemo(() => selectForExport(rowsInRange, state), [rowsInRange, state]);
  const summary = useMemo(() => summarize(rows), [rows]);

  const errors = {
    range: state.from && state.to && state.from > state.to ? "Start date must be on or before the end date." : undefined,
    categories: state.categories.length === 0 ? "Select at least one category." : undefined,
    filename: sanitizeFilename(state.filename, exporter.extension) ? undefined : "Enter a file name.",
  };
  const blocked = Object.values(errors).some(Boolean) || rows.length === 0;

  // Reset status, lock scroll, focus, and handle Escape while open.
  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[role=radio][aria-checked=true]")?.focus();
    return () => {
      document.body.style.overflow = "";
      prevFocus?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !blocked && !busy) handleExport();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function handleExport() {
    setStatus({ kind: "working", label: state.format === "pdf" ? "Loading PDF engine…" : `Building ${exporter.label}…` });
    try {
      // Yield a frame so the loading state paints before synchronous work starts.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (state.format === "pdf") setStatus({ kind: "working", label: `Rendering ${rows.length} rows…` });
      const filename = await runExport(rows, state);
      setStatus({ kind: "done", filename });
      notify(`Exported ${rows.length.toLocaleString()} record${rows.length === 1 ? "" : "s"} to ${filename}`);
      window.setTimeout(onClose, 900);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Export failed. Please try again." });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col bg-slate-50 shadow-2xl sm:max-w-md lg:max-w-5xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 id="export-title" className="text-base font-semibold text-slate-900">Export data</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose a format, narrow the data, and preview before downloading.
              <kbd className="ml-2 hidden rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] text-slate-500 lg:inline">Ctrl/⌘ ⇧ E</kbd>
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40" aria-label="Close export">
            <XIcon />
          </button>
        </header>

        {/* Body: options + preview */}
        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[22rem_1fr] lg:overflow-hidden">
          <div className="border-slate-200 bg-white px-5 py-5 lg:overflow-y-auto lg:border-r">
            <ExportOptionsPanel state={state} dispatch={dispatch} rowsInRange={rowsInRange} errors={errors} disabled={busy} />
          </div>
          <div className="flex min-h-[24rem] flex-col px-5 py-5 lg:min-h-0">
            <ExportPreview rows={rows} state={state} />
          </div>
        </div>

        {/* Footer: summary + actions */}
        <footer className="border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <dl className="flex flex-1 flex-wrap gap-x-6 gap-y-1 text-sm" aria-live="polite">
              <Stat label="Records" value={summary.count.toLocaleString()} />
              <Stat label="Total" value={formatCurrency(summary.totalCents)} />
              <Stat
                label="Spanning"
                value={summary.firstDate && summary.lastDate ? `${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}` : "—"}
                className="hidden sm:block"
              />
            </dl>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button onClick={onClose} disabled={busy} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleExport} disabled={blocked || busy} className="btn-primary flex-1 whitespace-nowrap sm:min-w-[11rem] sm:flex-none">
                {status.kind === "working" ? (
                  <>
                    <Spinner /> {status.label}
                  </>
                ) : status.kind === "done" ? (
                  <>✓ Downloaded</>
                ) : (
                  <>
                    <DownloadIcon width={16} height={16} /> Export {summary.count ? summary.count.toLocaleString() : ""} as {exporter.label}
                  </>
                )}
              </button>
            </div>
          </div>
          {status.kind === "error" && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600">
              {status.message}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;
}
