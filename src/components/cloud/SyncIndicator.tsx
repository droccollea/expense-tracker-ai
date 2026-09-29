"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useExpenses } from "@/hooks/useExpenses";
import { relativeTime } from "./relativeTime";

type SyncState = "syncing" | "synced" | "pending" | "never";

/** Navbar pill that reflects backup freshness, with a quick "Back up now". */
export function SyncIndicator() {
  const { hydrated, activeJobs, lastBackupAt, pendingChanges, schedules, runExport } = useCloud();
  const { expenses } = useExpenses();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000); // keep "5 min ago" fresh
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  if (!hydrated) return null;

  const syncing = activeJobs.some((j) => j.spec.templateId === "full-backup");
  const state: SyncState = syncing ? "syncing" : !lastBackupAt ? "never" : pendingChanges > 0 ? "pending" : "synced";
  const autoBackup = schedules.find((s) => s.active && s.spec.templateId === "full-backup");

  const styles: Record<SyncState, { dot: string; label: string; text: string }> = {
    syncing: { dot: "bg-brand-500 animate-pulse", label: "Syncing…", text: "text-brand-700" },
    synced: { dot: "bg-emerald-500", label: "Backed up", text: "text-slate-600" },
    pending: { dot: "bg-amber-500", label: `${pendingChanges} unsynced`, text: "text-amber-800" },
    never: { dot: "bg-slate-400", label: "Not backed up", text: "text-slate-600" },
  };
  const s = styles[state];

  function backupNow() {
    runExport(
      autoBackup?.spec ?? { templateId: "full-backup", period: "all", format: "json", destination: "download", settings: {} },
      "backup",
    );
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm transition hover:bg-slate-50 ${s.text}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={syncing ? "animate-pulse" : ""}>
          <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z" />
        </svg>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
        <span className="hidden md:inline">{s.label}</span>
        <span className="sr-only md:hidden">{s.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 animate-slide-in rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">
            {state === "synced" ? "Everything is backed up" : state === "syncing" ? "Backing up…" : state === "pending" ? "Changes since last backup" : "No backup yet"}
          </p>
          <dl className="mt-3 space-y-1.5 text-xs">
            <Row label="Last backup" value={lastBackupAt ? relativeTime(lastBackupAt) : "Never"} />
            <Row label="Unsynced changes" value={String(pendingChanges)} />
            <Row label="Expenses" value={String(expenses.length)} />
            <Row label="Auto-backup" value={autoBackup ? relativeTime(autoBackup.nextRunAt) : "Off"} />
          </dl>
          <div className="mt-4 flex gap-2">
            <button onClick={backupNow} disabled={syncing || expenses.length === 0} className="btn-primary flex-1 px-3 py-2 text-xs">
              Back up now
            </button>
            <Link href="/exports?tab=schedules" onClick={() => setOpen(false)} className="btn-secondary px-3 py-2 text-xs">
              {autoBackup ? "Manage" : "Automate"}
            </Link>
          </div>
          {!autoBackup && <p className="mt-2 text-[11px] text-slate-500">Back up now saves a JSON file to this device.</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-800">{value}</dd>
    </div>
  );
}
