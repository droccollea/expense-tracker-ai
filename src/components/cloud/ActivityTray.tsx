"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { TEMPLATES } from "@/lib/cloud/templates";
import { ServiceTile } from "./ServiceTile";

const LINGER_MS = 6000;

/** Floating panel showing background exports in progress — like an upload tray. */
export function ActivityTray() {
  const { jobs } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const visible = jobs.filter(
    (j) => j.status === "queued" || j.status === "running" || (j.finishedAt && now - new Date(j.finishedAt).getTime() < LINGER_MS),
  );

  useEffect(() => {
    if (!visible.length) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [visible.length]);

  if (!visible.length) return null;
  const running = visible.filter((j) => j.status === "running" || j.status === "queued").length;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] animate-slide-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="region"
      aria-label="Export activity"
    >
      <button onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-between bg-slate-900 px-4 py-2.5 text-left text-sm font-medium text-white">
        <span>{running ? `Exporting ${running} item${running === 1 ? "" : "s"}…` : "Exports complete"}</span>
        <span className="text-slate-400" aria-hidden>
          {collapsed ? "▴" : "▾"}
        </span>
      </button>
      {!collapsed && (
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
          {visible.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-3">
              <ServiceTile id={j.spec.destination} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {TEMPLATES[j.spec.templateId].name} → {DESTINATIONS[j.spec.destination].name}
                </p>
                {j.status === "failed" ? (
                  <p className="truncate text-xs text-red-600">{j.error}</p>
                ) : j.status === "succeeded" ? (
                  <p className="truncate text-xs text-emerald-700">✓ {j.detail}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{j.stage}…</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${Math.max(6, j.progress)}%` }} />
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!collapsed && (
        <Link href="/exports?tab=history" className="block border-t border-slate-100 px-4 py-2 text-center text-xs font-medium text-brand-600 hover:bg-slate-50">
          View export history
        </Link>
      )}
    </div>
  );
}
