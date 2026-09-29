"use client";

import { useCloud } from "@/hooks/useCloud";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { SCHEDULE_PRESETS } from "./Schedules";
import type { TemplateId } from "@/lib/cloud/types";

export type HubTab = "send" | "share" | "schedules" | "history" | "integrations";

interface Suggestion {
  key: string;
  icon: string;
  title: string;
  body: string;
  action: string;
  run: () => void;
}

/** Context-aware nudges: backups, month-end, tax season, sharing. */
export function Insights({ go }: { go: (tab: HubTab, template?: TemplateId) => void }) {
  const { lastBackupAt, pendingChanges, schedules, shares, saveSchedule, runExport, connections } = useCloud();
  const { expenses } = useExpenses();
  const { notify } = useToast();
  if (!expenses.length) return null;

  const now = new Date();
  const out: Suggestion[] = [];

  if (pendingChanges > 0) {
    out.push({
      key: "backup",
      icon: "☁️",
      title: lastBackupAt ? `${pendingChanges} change${pendingChanges === 1 ? "" : "s"} since your last backup` : "You've never backed up",
      body: "A full backup takes a second and can be restored anywhere.",
      action: "Back up now",
      run: () => runExport({ templateId: "full-backup", period: "all", format: "json", destination: "download", settings: {} }, "backup"),
    });
  }
  if (!schedules.some((s) => s.spec.templateId === "full-backup")) {
    const cloud = (["dropbox", "onedrive"] as const).find((d) => connections[d]);
    out.push({
      key: "auto",
      icon: "⏱",
      title: "Put backups on autopilot",
      body: cloud ? "Weekly backup to your connected cloud drive, every Sunday night." : "Weekly backup every Sunday night. Connect Dropbox or OneDrive to send it there.",
      action: "Turn on",
      run: () => {
        const preset = SCHEDULE_PRESETS[0].draft;
        saveSchedule({ ...preset, spec: { ...preset.spec, destination: cloud ?? "download" } });
        notify("Weekly backup scheduled");
      },
    });
  }
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  if (now.getMonth() <= 3) {
    out.push({ key: "tax", icon: "🧾", title: "Tax season is here", body: "Your accountant will want last year's Tax Report.", action: "Prepare", run: () => go("send", "tax-report") });
  } else if (daysLeft <= 7) {
    out.push({ key: "month", icon: "📅", title: `Month closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, body: "Send yourself this month's summary while it's fresh.", action: "Prepare", run: () => go("send", "monthly-summary") });
  }
  if (!shares.length) {
    out.push({ key: "share", icon: "🔗", title: "Share a live report", body: "Send a read-only dashboard by link or QR code, with no account needed.", action: "Create link", run: () => go("share") });
  }

  if (!out.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {out.slice(0, 3).map((s) => (
        <div key={s.key} className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
          <span className="text-xl" aria-hidden>{s.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{s.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.body}</p>
            <button onClick={s.run} className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700">{s.action} →</button>
          </div>
        </div>
      ))}
    </div>
  );
}
