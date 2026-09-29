"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { TEMPLATES, TEMPLATE_LIST } from "@/lib/cloud/templates";
import { DESTINATIONS, DESTINATION_LIST } from "@/lib/cloud/destinations";
import { PERIODS } from "@/lib/cloud/period";
import type { DestinationId, DestinationSettings, ExportSpec, FileFormat, TemplateId } from "@/lib/cloud/types";
import { formatCurrency } from "@/lib/format";
import { ConnectDialog } from "./ConnectDialog";
import { DestinationPreview } from "./DestinationPreview";
import { ServiceTile, SimulatedBadge } from "./ServiceTile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACTION_LABEL: Record<DestinationId, string> = {
  download: "Download",
  email: "Send email",
  "google-sheets": "Send to Sheets",
  dropbox: "Upload to Dropbox",
  onedrive: "Upload to OneDrive",
  notion: "Publish to Notion",
  slack: "Post to Slack",
};

export function Composer({ initialTemplate, onSchedule }: { initialTemplate?: TemplateId; onSchedule: (spec: ExportSpec) => void }) {
  const { expenses } = useExpenses();
  const { connections, runExport } = useCloud();
  const { notify } = useToast();
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate ?? "monthly-summary");
  const template = TEMPLATES[templateId];
  const [period, setPeriod] = useState(template.defaultPeriod);
  const [format, setFormat] = useState<FileFormat>(template.defaultFormat);
  const [destination, setDestination] = useState<DestinationId>("download");
  const [settings, setSettings] = useState<DestinationSettings>({ recipients: [], folder: "/Ledgerly", sheetMode: "new", channel: "#finance" });
  const [recipientDraft, setRecipientDraft] = useState("");
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const dest = DESTINATIONS[destination];
  const spec: ExportSpec = { templateId, period, format, destination, settings };
  const ds = useMemo(() => template.build(expenses, period), [template, expenses, period]);

  function chooseTemplate(id: TemplateId) {
    setTemplateId(id);
    setPeriod(TEMPLATES[id].defaultPeriod);
    setFormat(TEMPLATES[id].defaultFormat);
  }

  function chooseDestination(id: DestinationId) {
    if (DESTINATIONS[id].requiresConnection && !connections[id]) setConnecting(id);
    else setDestination(id);
  }

  const set = (patch: Partial<DestinationSettings>) => setSettings((s) => ({ ...s, ...patch }));

  function addRecipient(raw: string) {
    const emails = raw.split(/[,\s;]+/).map((x) => x.trim()).filter(Boolean);
    const valid = emails.filter((e) => EMAIL_RE.test(e));
    if (valid.length) set({ recipients: [...new Set([...(settings.recipients ?? []), ...valid])].slice(0, 10) });
    setRecipientDraft(emails.filter((e) => !EMAIL_RE.test(e)).join(" "));
  }

  function onRecipientKey(e: KeyboardEvent<HTMLInputElement>) {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && recipientDraft.trim()) {
      if (e.key !== "Tab") e.preventDefault();
      addRecipient(recipientDraft);
    } else if (e.key === "Backspace" && !recipientDraft && settings.recipients?.length) {
      set({ recipients: settings.recipients.slice(0, -1) });
    }
  }

  const errors: string[] = [];
  if (ds.recordCount === 0) errors.push("No expenses in this period — pick a different period.");
  if (destination === "email" && !settings.recipients?.length) errors.push(recipientDraft ? `“${recipientDraft}” isn't a valid email address.` : "Add at least one recipient.");
  if (destination === "google-sheets" && settings.sheetMode === "append" && !settings.sheetName?.trim()) errors.push("Enter the name of the sheet to append to.");
  if (dest.kind === "cloud-file" && !settings.folder?.startsWith("/")) errors.push("Folder paths start with “/”.");
  if (destination === "slack" && !/^#[\w-]+$/.test(settings.channel ?? "")) errors.push("Channel should look like #finance.");

  function submit() {
    setSubmitted(true);
    if (recipientDraft.trim() && destination === "email") addRecipient(recipientDraft);
    if (errors.length) return;
    runExport(spec);
    notify(`${template.name} is on its way to ${dest.name}. Track it in the activity tray.`, "info");
    setSubmitted(false);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="space-y-6">
        <Step n={1} title="What do you want to share?">
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATE_LIST.map((t) => {
              const on = t.id === templateId;
              return (
                <button
                  key={t.id}
                  onClick={() => chooseTemplate(t.id)}
                  aria-pressed={on}
                  className={`group relative overflow-hidden rounded-xl border bg-white p-4 text-left transition ${on ? "border-transparent ring-2 ring-brand-500" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.accent} ${on ? "opacity-100" : "opacity-0 group-hover:opacity-60"} transition`} />
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" aria-hidden>{t.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{t.tagline}</p>
                      <p className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t.audience}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} title="Where should it go?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DESTINATION_LIST.map((d) => {
              const on = d.id === destination;
              const connected = !d.requiresConnection || !!connections[d.id];
              return (
                <button
                  key={d.id}
                  onClick={() => chooseDestination(d.id)}
                  aria-pressed={on}
                  className={`flex flex-col items-start gap-2 rounded-xl border bg-white p-3 text-left transition ${on ? "border-transparent ring-2 ring-brand-500" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <ServiceTile id={d.id} size={32} />
                  <span className="text-sm font-medium text-slate-900">{d.name}</span>
                  <span className={`text-[11px] font-medium ${connected ? "text-emerald-700" : "text-brand-600"}`}>
                    {d.requiresConnection ? (connected ? "● Connected" : "+ Connect") : d.kind === "local" ? "Instant" : "No setup"}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="Details">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <Field label="Period">
              <div className="flex flex-wrap gap-1.5">
                {template.periods.map((p) => (
                  <Pill key={p} active={p === period} onClick={() => setPeriod(p)}>{PERIODS.find((x) => x.id === p)!.label}</Pill>
                ))}
              </div>
            </Field>
            {!dest.nativeFormat && (
              <Field label="Format">
                <div className="flex gap-1.5">
                  {(["csv", "json"] as const).map((f) => (
                    <Pill key={f} active={f === format} onClick={() => setFormat(f)}>{f.toUpperCase()}</Pill>
                  ))}
                </div>
              </Field>
            )}

            {destination === "email" && (
              <>
                <Field label="To" htmlFor="recipients">
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                    {settings.recipients?.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {r}
                        <button onClick={() => set({ recipients: settings.recipients!.filter((x) => x !== r) })} aria-label={`Remove ${r}`} className="text-brand-500 hover:text-brand-700">×</button>
                      </span>
                    ))}
                    <input
                      id="recipients"
                      value={recipientDraft}
                      onChange={(e) => setRecipientDraft(e.target.value)}
                      onKeyDown={onRecipientKey}
                      onBlur={() => recipientDraft && addRecipient(recipientDraft)}
                      placeholder={settings.recipients?.length ? "" : "accountant@firm.com"}
                      className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none"
                    />
                  </div>
                </Field>
                <Field label="Subject" htmlFor="subject">
                  <input id="subject" value={settings.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} placeholder={`${ds.title} · ${ds.subtitle}`} className="input" />
                </Field>
                <Field label="Message" htmlFor="message">
                  <textarea id="message" rows={3} value={settings.message ?? ""} onChange={(e) => set({ message: e.target.value })} placeholder="Hi — here's my spending report." className="input resize-none" />
                </Field>
              </>
            )}
            {destination === "google-sheets" && (
              <>
                <Field label="Spreadsheet">
                  <div className="flex gap-1.5">
                    <Pill active={settings.sheetMode !== "append"} onClick={() => set({ sheetMode: "new" })}>Create new</Pill>
                    <Pill active={settings.sheetMode === "append"} onClick={() => set({ sheetMode: "append" })}>Append to existing</Pill>
                  </div>
                </Field>
                <Field label={settings.sheetMode === "append" ? "Existing sheet name" : "Name (optional)"} htmlFor="sheet">
                  <input id="sheet" value={settings.sheetName ?? ""} onChange={(e) => set({ sheetName: e.target.value })} placeholder={settings.sheetMode === "append" ? "Household budget 2026" : `${ds.title} - ${ds.subtitle}`} className="input" />
                </Field>
              </>
            )}
            {dest.kind === "cloud-file" && (
              <Field label="Folder" htmlFor="folder">
                <input id="folder" value={settings.folder ?? ""} onChange={(e) => set({ folder: e.target.value })} className="input font-mono" />
              </Field>
            )}
            {destination === "slack" && (
              <Field label="Channel" htmlFor="channel">
                <input id="channel" value={settings.channel ?? ""} onChange={(e) => set({ channel: e.target.value })} className="input" />
              </Field>
            )}
          </div>
        </Step>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-900">
              {ds.recordCount} expenses · {formatCurrency(ds.totalCents)}
            </p>
            {submitted && errors.length > 0 ? (
              <p role="alert" className="text-xs font-medium text-red-600">{errors[0]}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                Runs in the background — keep working while it sends.
                {dest.simulated && <SimulatedBadge />}
              </p>
            )}
          </div>
          <button onClick={() => onSchedule(spec)} className="btn-secondary">Schedule…</button>
          <button onClick={submit} className="btn-primary">{ACTION_LABEL[destination]}</button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <DestinationPreview ds={ds} spec={spec} />
      </aside>

      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} onConnected={(id) => setDestination(id)} />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}
