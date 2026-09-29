"use client";

import { useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { TEMPLATES } from "@/lib/cloud/templates";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { formatBytes } from "@/lib/cloud/serialize";
import type { ExportJob } from "@/lib/cloud/types";
import { ServiceTile } from "./ServiceTile";
import { Pill } from "./Composer";
import { relativeTime } from "./relativeTime";

type Filter = "all" | "succeeded" | "failed" | "scheduled";

export function History() {
  const { jobs, runExport, clearHistory } = useCloud();
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const done = jobs.filter((j) => j.status === "succeeded" || j.status === "failed");
  const ok = done.filter((j) => j.status === "succeeded");
  const shown = jobs.filter((j) =>
    filter === "all" ? true : filter === "scheduled" ? j.trigger !== "manual" : j.status === filter,
  );

  async function copyChecksum(j: ExportJob) {
    try {
      await navigator.clipboard.writeText(j.checksum!);
      notify("SHA-256 checksum copied");
    } catch {
      notify("Couldn't access the clipboard", "error");
    }
  }

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-slate-900">No exports yet</p>
        <p className="mt-1 text-sm text-slate-500">Every export — manual, scheduled or backup — is logged here with a checksum you can verify.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Exports" value={String(done.length)} />
        <Metric label="Data delivered" value={formatBytes(ok.reduce((s, j) => s + (j.bytes ?? 0), 0))} />
        <Metric label="Success rate" value={done.length ? `${Math.round((ok.length / done.length) * 100)}%` : "—"} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "succeeded", "failed", "scheduled"] as Filter[]).map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</Pill>
        ))}
        <div className="ml-auto">
          {confirmClear ? (
            <span className="flex items-center gap-2 text-xs">
              Clear all history?
              <button onClick={() => { clearHistory(); setConfirmClear(false); }} className="font-semibold text-red-600">Clear</button>
              <button onClick={() => setConfirmClear(false)} className="text-slate-500">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="text-xs font-medium text-slate-400 hover:text-slate-700">Clear history</button>
          )}
        </div>
      </div>

      <ol className="relative space-y-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {shown.map((j) => (
          <li key={j.id} className="flex flex-wrap items-start gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-nowrap">
            <ServiceTile id={j.spec.destination} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{TEMPLATES[j.spec.templateId].name}</p>
                <StatusPill job={j} />
                {j.trigger !== "manual" && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                    {j.trigger === "schedule" ? "⏱ Scheduled" : "☁ Backup"}
                  </span>
                )}
              </div>
              <p className={`mt-0.5 truncate text-xs ${j.status === "failed" ? "text-red-600" : "text-slate-500"}`}>
                {j.status === "failed" ? j.error : j.status === "succeeded" ? j.detail : `${j.stage}…`}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                <span title={new Date(j.createdAt).toLocaleString()}>{relativeTime(j.createdAt)}</span>
                <span>→ {DESTINATIONS[j.spec.destination].name}</span>
                {j.records !== undefined && <span>{j.records} records</span>}
                {j.bytes !== undefined && <span>{formatBytes(j.bytes)}</span>}
                {j.checksum && (
                  <button onClick={() => copyChecksum(j)} className="font-mono hover:text-slate-700" title="Copy SHA-256 checksum">
                    sha256:{j.checksum.slice(0, 10)}…
                  </button>
                )}
              </p>
            </div>
            <button onClick={() => runExport(j.spec)} className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700">↻ Run again</button>
          </li>
        ))}
        {!shown.length && <li className="p-6 text-center text-sm text-slate-500">No exports match this filter.</li>}
      </ol>
    </div>
  );
}

function StatusPill({ job }: { job: ExportJob }) {
  const map = {
    queued: ["Queued", "bg-slate-100 text-slate-600"],
    running: ["Running", "bg-brand-50 text-brand-700"],
    succeeded: ["✓ Delivered", "bg-emerald-50 text-emerald-700"],
    failed: ["✕ Failed", "bg-red-50 text-red-700"],
  } as const;
  const [label, cls] = map[job.status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
