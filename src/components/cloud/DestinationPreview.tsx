import { DESTINATIONS } from "@/lib/cloud/destinations";
import { fileNameFor, formatBytes, serialize } from "@/lib/cloud/serialize";
import type { Dataset, ExportSpec } from "@/lib/cloud/types";
import { formatCurrency } from "@/lib/format";
import { ServiceTile } from "./ServiceTile";

const MAX_ROWS = 7;

/** Shows what the export will look like where it lands. */
export function DestinationPreview({ ds, spec }: { ds: Dataset; spec: ExportSpec }) {
  const dest = DESTINATIONS[spec.destination];
  const file = serialize(ds, spec.format, new Date());
  const fileName = fileNameFor(ds, file.extension);
  const size = formatBytes(new Blob([file.content]).size);

  switch (spec.destination) {
    case "email":
      return (
        <Frame label="Email preview">
          <div className="space-y-1.5 border-b border-slate-100 px-4 py-3 text-xs">
            <p><span className="inline-block w-14 text-slate-400">From</span><span className="text-slate-700">Ledgerly Reports</span></p>
            <p className="flex flex-wrap gap-1"><span className="inline-block w-14 text-slate-400">To</span>
              {(spec.settings.recipients ?? []).length ? spec.settings.recipients!.map((r) => <span key={r} className="rounded bg-slate-100 px-1.5 text-slate-700">{r}</span>) : <span className="italic text-slate-400">add a recipient</span>}
            </p>
            <p><span className="inline-block w-14 text-slate-400">Subject</span><span className="font-medium text-slate-900">{spec.settings.subject || `${ds.title} · ${ds.subtitle}`}</span></p>
          </div>
          <div className="space-y-3 px-4 py-4 text-sm text-slate-700">
            {spec.settings.message && <p className="whitespace-pre-wrap">{spec.settings.message}</p>}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{ds.subtitle}</p>
              <p className="text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(ds.totalCents)}</p>
              <p className="text-xs text-slate-500">{ds.recordCount} transactions</p>
            </div>
            <Attachment name={fileName} size={size} ext={file.extension} />
          </div>
        </Frame>
      );
    case "google-sheets":
      return (
        <Frame label="Google Sheets preview">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#f1f8f4] px-3 py-2">
            <ServiceTile id="google-sheets" size={22} />
            <span className="truncate text-sm font-medium text-slate-800">{spec.settings.sheetMode === "append" ? spec.settings.sheetName || "Existing sheet" : spec.settings.sheetName || fileName.replace(/\.\w+$/, "")}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400">
                  <th className="w-8 border border-slate-200" />
                  {ds.columns.map((_, i) => <th key={i} className="border border-slate-200 px-2 py-0.5 font-normal">{String.fromCharCode(65 + i)}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 text-center text-slate-400">1</td>
                  {ds.columns.map((c) => <td key={c.key} className="whitespace-nowrap border border-slate-200 bg-emerald-50 px-2 py-1 font-semibold text-slate-800">{c.label}</td>)}
                </tr>
                {ds.rows.slice(0, MAX_ROWS).map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 bg-slate-50 text-center text-slate-400">{i + 2}</td>
                    {ds.columns.map((c) => <td key={c.key} className={`max-w-[10rem] truncate whitespace-nowrap border border-slate-200 px-2 py-1 text-slate-700 ${c.align === "right" ? "text-right" : ""}`}>{r[c.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <More n={ds.rows.length - MAX_ROWS} unit="rows" />
        </Frame>
      );
    case "slack":
      return (
        <Frame label="Slack preview">
          <div className="flex gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500 font-bold text-white">L</span>
            <div className="min-w-0 text-sm">
              <p><span className="font-bold text-slate-900">Ledgerly</span> <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">APP</span> <span className="text-xs text-slate-400">now</span></p>
              <p className="mt-0.5 text-slate-500">in <span className="font-medium text-slate-700">{spec.settings.channel || "#general"}</span></p>
              <p className="mt-2 font-bold text-slate-900">📊 {ds.title} · {ds.subtitle}</p>
              <p className="text-slate-700">Total <b>{formatCurrency(ds.totalCents)}</b> across {ds.recordCount} transactions</p>
              <ul className="mt-1 space-y-0.5 text-slate-700">
                {ds.rows.filter((r) => r.total ?? r.amount).slice(0, 4).map((r, i) => (
                  <li key={i}>• {String(r.category)} — {formatCurrency(Math.round(Number(r.total ?? r.amount) * 100))}</li>
                ))}
              </ul>
            </div>
          </div>
        </Frame>
      );
    case "notion":
      return (
        <Frame label="Notion preview">
          <div className="p-5">
            <p className="text-2xl">{ds.title === "Tax Report" ? "🧾" : "📊"}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{ds.title}</p>
            <p className="text-sm text-slate-500">{ds.subtitle}</p>
            <table className="mt-4 w-full text-left text-xs">
              <thead className="text-slate-400"><tr>{ds.columns.slice(0, 4).map((c) => <th key={c.key} className="border-b border-slate-200 py-1.5 pr-3 font-normal">{c.label}</th>)}</tr></thead>
              <tbody>{ds.rows.slice(0, 5).map((r, i) => <tr key={i}>{ds.columns.slice(0, 4).map((c) => <td key={c.key} className="max-w-[9rem] truncate border-b border-slate-100 py-1.5 pr-3 text-slate-700">{r[c.key]}</td>)}</tr>)}</tbody>
            </table>
            <More n={ds.rows.length - 5} unit="rows" />
          </div>
        </Frame>
      );
    default:
      return (
        <Frame label={dest.kind === "local" ? "File preview" : `${dest.name} preview`}>
          <div className="border-b border-slate-100 p-4">
            {dest.kind === "cloud-file" && <p className="mb-2 font-mono text-xs text-slate-400">{(spec.settings.folder || "/Ledgerly").replace(/\/$/, "")}/</p>}
            <Attachment name={fileName} size={size} ext={file.extension} />
          </div>
          <pre className="max-h-64 overflow-auto bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">{file.content.replace(/^﻿/, "").split(/\r?\n/).slice(0, 14).join("\n")}</pre>
        </Frame>
      );
  }
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{children}</div>
    </div>
  );
}

function Attachment({ name, size, ext }: { name: string; size: string; ext: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className={`grid h-9 w-8 place-items-center rounded text-[10px] font-bold uppercase text-white ${ext === "csv" ? "bg-emerald-600" : "bg-slate-700"}`}>{ext}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{size}</p>
      </div>
    </div>
  );
}

function More({ n, unit }: { n: number; unit: string }) {
  if (n <= 0) return null;
  return <p className="border-t border-slate-100 px-3 py-1.5 text-center text-[11px] text-slate-400">+ {n} more {unit}</p>;
}
