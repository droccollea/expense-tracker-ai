"use client";

import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { ServiceTile, SimulatedBadge } from "./ServiceTile";

const SCOPES: Partial<Record<DestinationId, string[]>> = {
  "google-sheets": ["Create spreadsheets in your Google Drive", "Edit spreadsheets created by Ledgerly"],
  dropbox: ["Write files to /Apps/Ledgerly", "Read metadata of files Ledgerly created"],
  onedrive: ["Write files to the Ledgerly app folder", "Read files Ledgerly created"],
  notion: ["Create pages and databases in pages you share", "Insert rows into Ledgerly databases"],
  slack: ["Post messages to channels you choose", "View basic workspace info"],
};

/** Simulated OAuth consent flow — mirrors the real redirect/consent/callback steps. */
export function ConnectDialog({ id, onClose, onConnected }: { id: DestinationId | null; onClose: () => void; onConnected?: (id: DestinationId) => void }) {
  const { connect } = useCloud();
  const { notify } = useToast();
  const [phase, setPhase] = useState<"consent" | "connecting" | "done">("consent");

  useEffect(() => setPhase("consent"), [id]);

  if (!id) return null;
  const d = DESTINATIONS[id];

  async function allow() {
    setPhase("connecting");
    await new Promise((r) => setTimeout(r, 1100));
    connect(id!);
    setPhase("done");
    notify(`${d.name} connected`);
    setTimeout(() => {
      onConnected?.(id!);
      onClose();
    }, 700);
  }

  return (
    <Modal open title={`Connect ${d.name}`} onClose={onClose} size="sm">
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white">L</span>
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full bg-slate-300 ${phase === "connecting" ? "animate-pulse" : ""}`} style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
          <ServiceTile id={id} size={44} />
        </div>

        {phase === "done" ? (
          <p className="text-center text-sm font-medium text-emerald-700">✓ Connected as {id === "slack" || id === "notion" ? "your workspace" : "you@example.com"}</p>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">Ledgerly wants to access your {d.name} account</p>
              <p className="mt-1 text-xs text-slate-500">You can disconnect at any time from Integrations.</p>
            </div>
            <ul className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {(SCOPES[id] ?? []).map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <SimulatedBadge className="mt-px" />
              This demo doesn&apos;t contact {d.name}. The connection is stored only in this browser.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="btn-secondary" disabled={phase === "connecting"}>
                Cancel
              </button>
              <button onClick={allow} className="btn-primary" disabled={phase === "connecting"} data-autofocus>
                {phase === "connecting" ? "Connecting…" : "Allow access"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
