"use client";

import { useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { DESTINATION_LIST } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";
import { ServiceTile, SimulatedBadge } from "./ServiceTile";
import { ConnectDialog } from "./ConnectDialog";
import { relativeTime } from "./relativeTime";

const COMING_SOON = [
  { name: "QuickBooks", mark: "QB", color: "#2ca01c" },
  { name: "Xero", mark: "X", color: "#13b5ea" },
  { name: "Excel Online", mark: "XL", color: "#107c41" },
  { name: "Webhooks", mark: "{}", color: "#475569" },
];

export function Integrations() {
  const { connections, disconnect, jobs } = useCloud();
  const { notify } = useToast();
  const [connecting, setConnecting] = useState<DestinationId | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DESTINATION_LIST.map((d) => {
          const conn = connections[d.id];
          const uses = jobs.filter((j) => j.spec.destination === d.id && j.status === "succeeded").length;
          return (
            <div key={d.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <ServiceTile id={d.id} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    {d.name} {d.simulated && <SimulatedBadge />}
                  </p>
                  <p className="text-xs text-slate-500">{d.blurb}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                {!d.requiresConnection ? (
                  <span className="text-slate-500">Always available{uses ? ` · used ${uses}×` : ""}</span>
                ) : conn ? (
                  <>
                    <span className="min-w-0 truncate text-slate-600">
                      <span className="text-emerald-600">●</span> {conn.account} · {relativeTime(conn.connectedAt)}
                    </span>
                    <button
                      onClick={() => {
                        disconnect(d.id);
                        notify(`${d.name} disconnected`, "info");
                      }}
                      className="shrink-0 font-medium text-slate-400 hover:text-red-600"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">Not connected</span>
                    <button onClick={() => setConnecting(d.id)} className="btn-secondary px-3 py-1 text-xs">Connect</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Coming soon</p>
        <div className="flex flex-wrap gap-2">
          {COMING_SOON.map((c) => (
            <span key={c.name} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs text-slate-500">
              <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white opacity-60" style={{ backgroundColor: c.color }}>{c.mark}</span>
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <ConnectDialog id={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}
