"use client";

import { useEffect, useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { Modal } from "../Modal";
import { TEMPLATES, TEMPLATE_LIST } from "@/lib/cloud/templates";
import { DESTINATIONS, DESTINATION_LIST } from "@/lib/cloud/destinations";
import { PERIODS } from "@/lib/cloud/period";
import { WEEKDAYS, computeNextRun, describeSchedule } from "@/lib/cloud/schedule";
import type { ExportSpec, Frequency, Schedule } from "@/lib/cloud/types";
import { ServiceTile, SimulatedBadge } from "./ServiceTile";
import { ConnectDialog } from "./ConnectDialog";
import { Pill } from "./Composer";
import { relativeTime } from "./relativeTime";

type Draft = Omit<Schedule, "id" | "createdAt" | "nextRunAt"> & { id?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SCHEDULE_PRESETS: { label: string; blurb: string; draft: Draft }[] = [
  {
    label: "Weekly backup",
    blurb: "Full JSON backup every Sunday night",
    draft: { name: "Weekly backup", spec: { templateId: "full-backup", period: "all", format: "json", destination: "download", settings: { folder: "/Ledgerly/Backups" } }, frequency: "weekly", weekday: 0, dayOfMonth: 1, time: "21:00", active: true },
  },
  {
    label: "Monthly summary email",
    blurb: "Last month's summary on the 1st",
    draft: { name: "Monthly summary", spec: { templateId: "monthly-summary", period: "last-month", format: "csv", destination: "email", settings: { recipients: [] } }, frequency: "monthly", weekday: 1, dayOfMonth: 1, time: "08:00", active: true },
  },
  {
    label: "Category pulse to Slack",
    blurb: "Category analysis every Monday",
    draft: { name: "Monday category pulse", spec: { templateId: "category-analysis", period: "last-3-months", format: "csv", destination: "slack", settings: { channel: "#finance" } }, frequency: "weekly", weekday: 1, dayOfMonth: 1, time: "09:00", active: true },
  },
];

export function Schedules({ draftFromComposer, onDraftConsumed }: { draftFromComposer: ExportSpec | null; onDraftConsumed: () => void }) {
  const { schedules, toggleSchedule, deleteSchedule, runScheduleNow, jobs } = useCloud();
  const [editing, setEditing] = useState<Draft | null>(null);

  // A spec handed over from the composer opens the form pre-filled.
  useEffect(() => {
    if (!draftFromComposer) return;
    const { templateId, destination } = draftFromComposer;
    setEditing({ name: `${TEMPLATES[templateId].name} → ${DESTINATIONS[destination].name}`, spec: draftFromComposer, frequency: "weekly", weekday: 1, dayOfMonth: 1, time: "09:00", active: true });
    onDraftConsumed();
  }, [draftFromComposer, onDraftConsumed]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          Recurring exports run in the background while Ledgerly is open in any tab. If a run is missed, it catches up the next time you open the app.
        </p>
        <button onClick={() => setEditing(SCHEDULE_PRESETS[0].draft)} className="btn-primary">+ New schedule</button>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">Start from a recipe</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {SCHEDULE_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setEditing(p.draft)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-500 hover:shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{TEMPLATES[p.draft.spec.templateId].icon}</span>
                  <span className="text-slate-300">→</span>
                  <ServiceTile id={p.draft.spec.destination} size={24} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{p.label}</p>
                <p className="text-xs text-slate-500">{p.blurb}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {schedules.map((s) => {
            const last = jobs.find((j) => j.scheduleId === s.id && j.finishedAt);
            return (
              <li key={s.id} className={`rounded-xl border bg-white p-4 transition ${s.active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>{TEMPLATES[s.spec.templateId].icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{describeSchedule(s)}</p>
                  </div>
                  <Switch on={s.active} onChange={() => toggleSchedule(s.id)} label={`${s.active ? "Pause" : "Resume"} ${s.name}`} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <ServiceTile id={s.spec.destination} size={20} />
                  {DESTINATIONS[s.spec.destination].name}
                  {DESTINATIONS[s.spec.destination].simulated && <SimulatedBadge />}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                  <div>
                    <dt className="text-slate-400">Next run</dt>
                    <dd className="font-medium text-slate-800" title={new Date(s.nextRunAt).toLocaleString()}>{s.active ? relativeTime(s.nextRunAt) : "Paused"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Last run</dt>
                    <dd className={`font-medium ${last?.status === "failed" ? "text-red-600" : "text-slate-800"}`}>
                      {last ? `${last.status === "failed" ? "Failed" : "✓"} ${relativeTime(last.finishedAt!)}` : "Never"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-3 text-xs font-medium">
                  <button onClick={() => runScheduleNow(s.id)} className="text-brand-600 hover:text-brand-700">Run now</button>
                  <button onClick={() => setEditing(s)} className="text-slate-600 hover:text-slate-900">Edit</button>
                  <button onClick={() => deleteSchedule(s.id)} className="ml-auto text-slate-400 hover:text-red-600">Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <ScheduleForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ScheduleForm({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { saveSchedule, connections } = useCloud();
  const { notify } = useToast();
  const [d, setD] = useState<Draft>(initial);
  const [recipients, setRecipients] = useState((initial.spec.settings.recipients ?? []).join(", "));
  const [connecting, setConnecting] = useState<ExportSpec["destination"] | null>(null);
  const [tried, setTried] = useState(false);
  const template = TEMPLATES[d.spec.templateId];
  const dest = DESTINATIONS[d.spec.destination];
  const setSpec = (patch: Partial<ExportSpec>) => setD((x) => ({ ...x, spec: { ...x.spec, ...patch } }));

  const emails = recipients.split(/[,\s;]+/).filter(Boolean);
  const errors: string[] = [];
  if (!d.name.trim()) errors.push("Give the schedule a name.");
  if (d.spec.destination === "email" && (!emails.length || !emails.every((e) => EMAIL_RE.test(e)))) errors.push("Enter valid recipient email addresses.");
  if (dest.requiresConnection && !connections[d.spec.destination]) errors.push(`Connect ${dest.name} first.`);

  function save() {
    setTried(true);
    if (errors.length) return;
    saveSchedule({ ...d, spec: { ...d.spec, settings: { ...d.spec.settings, recipients: emails } } });
    notify(`Schedule “${d.name}” ${d.id ? "updated" : "created"} · next run ${relativeTime(computeNextRun(d).toISOString())}`);
    onClose();
  }

  return (
    <Modal open title={d.id ? "Edit schedule" : "New schedule"} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Name</span>
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="input" />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Report</span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_LIST.map((t) => (
              <Pill key={t.id} active={t.id === d.spec.templateId} onClick={() => setSpec({ templateId: t.id, period: t.defaultPeriod, format: t.defaultFormat })}>{t.icon} {t.name}</Pill>
            ))}
          </div>
          {template.periods.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {template.periods.map((p) => (
                <Pill key={p} active={p === d.spec.period} onClick={() => setSpec({ period: p })}>{PERIODS.find((x) => x.id === p)!.label}</Pill>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Destination</span>
          <div className="flex flex-wrap gap-1.5">
            {DESTINATION_LIST.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => (x.requiresConnection && !connections[x.id] ? setConnecting(x.id) : setSpec({ destination: x.id }))}
                aria-pressed={x.id === d.spec.destination}
                title={x.name}
                className={`rounded-xl p-1 transition ${x.id === d.spec.destination ? "ring-2 ring-brand-500" : "opacity-60 hover:opacity-100"}`}
              >
                <ServiceTile id={x.id} size={32} />
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{dest.name} — {dest.blurb}</p>
        </div>
        {d.spec.destination === "email" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Recipients</span>
            <input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="me@example.com, partner@example.com" className="input" />
          </label>
        )}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Repeat</span>
          <div className="flex flex-wrap items-center gap-2">
            {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
              <Pill key={f} active={d.frequency === f} onClick={() => setD({ ...d, frequency: f })}>{f[0].toUpperCase() + f.slice(1)}</Pill>
            ))}
            {d.frequency === "weekly" && (
              <select aria-label="Weekday" value={d.weekday} onChange={(e) => setD({ ...d, weekday: +e.target.value })} className="input w-auto py-1">
                {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
              </select>
            )}
            {d.frequency === "monthly" && (
              <select aria-label="Day of month" value={d.dayOfMonth} onChange={(e) => setD({ ...d, dayOfMonth: +e.target.value })} className="input w-auto py-1">
                {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}
              </select>
            )}
            <input aria-label="Time" type="time" value={d.time} onChange={(e) => e.target.value && setD({ ...d, time: e.target.value })} className="input w-auto py-1" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {describeSchedule(d)} · next run <b>{computeNextRun(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</b>
          </p>
        </div>
        {tried && errors[0] && <p role="alert" className="text-xs font-medium text-red-600">{errors[0]}</p>}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary">{d.id ? "Save changes" : "Create schedule"}</button>
        </div>
      </div>
      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} onConnected={(id) => setSpec({ destination: id })} />
    </Modal>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
    </button>
  );
}
