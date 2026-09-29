"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCloud } from "@/hooks/useCloud";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExportSpec, TemplateId } from "@/lib/cloud/types";
import { Composer } from "@/components/cloud/Composer";
import { SharePanel } from "@/components/cloud/SharePanel";
import { Schedules } from "@/components/cloud/Schedules";
import { History } from "@/components/cloud/History";
import { Integrations } from "@/components/cloud/Integrations";
import { Insights, type HubTab } from "@/components/cloud/Insights";
import { relativeTime } from "@/components/cloud/relativeTime";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/Skeleton";

const TABS: { id: HubTab; label: string }[] = [
  { id: "send", label: "Send" },
  { id: "share", label: "Share" },
  { id: "schedules", label: "Schedules" },
  { id: "history", label: "History" },
  { id: "integrations", label: "Integrations" },
];

export default function ExportsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ExportHub />
    </Suspense>
  );
}

function ExportHub() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "send") as HubTab;
  const { expenses, isLoading } = useExpenses();
  const { hydrated, connections, schedules, jobs, lastBackupAt } = useCloud();
  const [template, setTemplate] = useState<TemplateId | undefined>();
  const [scheduleDraft, setScheduleDraft] = useState<ExportSpec | null>(null);
  const consumeDraft = useCallback(() => setScheduleDraft(null), []);

  const go = (t: HubTab, tpl?: TemplateId) => {
    if (tpl) setTemplate(tpl);
    router.replace(t === "send" ? "/exports" : `/exports?tab=${t}`, { scroll: false });
  };

  if (isLoading || !hydrated) return <DashboardSkeleton />;

  const thisMonth = jobs.filter((j) => j.status === "succeeded" && j.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
  const counts: Partial<Record<HubTab, number>> = {
    schedules: schedules.filter((s) => s.active).length,
    history: jobs.length,
    integrations: Object.keys(connections).length,
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Export &amp; Sync</h1>
            <p className="mt-1 max-w-lg text-sm text-slate-600">Send reports where they&apos;re needed, share live read-only links, and keep automatic backups running.</p>
          </div>
          <dl className="flex flex-wrap gap-2 text-xs">
            <Chip label="Connected" value={`${Object.keys(connections).length} service${Object.keys(connections).length === 1 ? "" : "s"}`} />
            <Chip label="Schedules" value={`${counts.schedules} active`} />
            <Chip label="This month" value={`${thisMonth} exports`} />
            <Chip label="Last backup" value={lastBackupAt ? relativeTime(lastBackupAt) : "never"} />
          </dl>
        </div>
        <div className="relative mt-5">
          <Insights go={go} />
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <span aria-hidden>ⓘ</span>
        <span>
          <b>Demo mode:</b> email and third-party integrations are simulated, and nothing is sent to other services. Downloads, schedules, history and share links work for real.
        </span>
      </p>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Export sections">
        <div className="flex w-max gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => go(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {t.label}
              {!!counts[t.id] && <span className="rounded-full bg-slate-200 px-1.5 text-[10px] tabular-nums text-slate-600">{counts[t.id]}</span>}
            </button>
          ))}
        </div>
      </nav>

      {expenses.length === 0 && (tab === "send" || tab === "share") ? (
        <EmptyState title="Nothing to export yet" description="Add some expenses first, then come back to send, share or schedule reports." />
      ) : tab === "send" ? (
        <Composer key={template} initialTemplate={template} onSchedule={(spec) => { setScheduleDraft(spec); go("schedules"); }} />
      ) : tab === "share" ? (
        <SharePanel />
      ) : tab === "schedules" ? (
        <Schedules draftFromComposer={scheduleDraft} onDraftConsumed={consumeDraft} />
      ) : tab === "history" ? (
        <History />
      ) : (
        <Integrations />
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-1.5 backdrop-blur">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
