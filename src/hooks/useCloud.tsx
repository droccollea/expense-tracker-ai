"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useExpenses } from "./useExpenses";
import { useToast } from "./useToast";
import { generateId } from "@/lib/storage";
import { TEMPLATES } from "@/lib/cloud/templates";
import { DESTINATIONS, simulatedAccount } from "@/lib/cloud/destinations";
import { fileNameFor, serialize, sha256 } from "@/lib/cloud/serialize";
import { computeNextRun } from "@/lib/cloud/schedule";
import type { Connection, DestinationId, ExportJob, ExportSpec, Schedule, ShareLink } from "@/lib/cloud/types";

const STORAGE_KEY = "ledgerly-cloud:v1";
const MAX_HISTORY = 50;
const SCHEDULER_TICK_MS = 20_000;

interface CloudState {
  connections: Partial<Record<DestinationId, Connection>>;
  jobs: ExportJob[];
  schedules: Schedule[];
  shares: ShareLink[];
}

const EMPTY: CloudState = { connections: {}, jobs: [], schedules: [], shares: [] };

interface CloudContextValue extends CloudState {
  hydrated: boolean;
  runExport: (spec: ExportSpec, trigger?: ExportJob["trigger"], scheduleId?: string) => string;
  connect: (id: DestinationId) => void;
  disconnect: (id: DestinationId) => void;
  saveSchedule: (s: Omit<Schedule, "id" | "createdAt" | "nextRunAt"> & { id?: string }) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  runScheduleNow: (id: string) => void;
  addShare: (link: ShareLink) => void;
  removeShare: (id: string) => void;
  clearHistory: () => void;
  lastBackupAt: string | null;
  pendingChanges: number;
  activeJobs: ExportJob[];
}

const CloudContext = createContext<CloudContextValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadState(): CloudState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const s = JSON.parse(raw);
    return {
      connections: s.connections ?? {},
      // Jobs interrupted by a reload can't resume; mark them failed rather than spinning forever.
      jobs: (s.jobs ?? []).map((j: ExportJob) =>
        j.status === "running" || j.status === "queued" ? { ...j, status: "failed", error: "Interrupted — the tab was closed while this export was running." } : j,
      ),
      schedules: s.schedules ?? [],
      shares: s.shares ?? [],
    };
  } catch {
    return EMPTY;
  }
}

function describeResult(spec: ExportSpec, fileName: string): string {
  const s = spec.settings;
  switch (spec.destination) {
    case "download":
      return `Saved ${fileName}`;
    case "email":
      return `Emailed to ${(s.recipients ?? []).join(", ")}`;
    case "google-sheets":
      return s.sheetMode === "append" ? `Appended rows to “${s.sheetName}”` : `Created spreadsheet “${s.sheetName || fileName.replace(/\.\w+$/, "")}”`;
    case "dropbox":
    case "onedrive":
      return `Uploaded to ${(s.folder || "/Ledgerly").replace(/\/$/, "")}/${fileName}`;
    case "notion":
      return `Published database “${fileName.replace(/\.\w+$/, "")}”`;
    case "slack":
      return `Posted summary to ${s.channel || "#general"}`;
  }
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses } = useExpenses();
  const { notify } = useToast();
  const [state, setState] = useState<CloudState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* non-critical */
    }
  }, [state, hydrated]);

  const patchJob = useCallback((id: string, patch: Partial<ExportJob>) => {
    setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));
  }, []);

  const runExport = useCallback<CloudContextValue["runExport"]>(
    (spec, trigger = "manual", scheduleId) => {
      const id = generateId();
      const dest = DESTINATIONS[spec.destination];
      const job: ExportJob = { id, spec, trigger, scheduleId, status: "queued", stage: "Queued", progress: 0, createdAt: new Date().toISOString() };
      setState((s) => ({ ...s, jobs: [job, ...s.jobs].slice(0, MAX_HISTORY) }));

      (async () => {
        try {
          if (dest.requiresConnection && !stateRef.current.connections[spec.destination]) {
            throw new Error(`${dest.name} isn't connected. Reconnect it under Integrations.`);
          }
          const template = TEMPLATES[spec.templateId];
          let fileName = "";
          for (let i = 0; i < dest.stages.length; i++) {
            patchJob(id, { status: "running", stage: dest.stages[i], progress: Math.round((i / dest.stages.length) * 100) });
            if (i === 0) {
              const ds = template.build(expensesRef.current, spec.period);
              const file = serialize(ds, spec.format, new Date());
              fileName = fileNameFor(ds, file.extension);
              const checksum = await sha256(file.content);
              patchJob(id, { fileName, records: ds.recordCount, bytes: new Blob([file.content]).size, checksum });
              if (spec.destination === "download") {
                const url = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
                const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 10_000);
              }
            }
            // Simulated network latency for remote destinations; local saves stay snappy.
            await sleep(dest.simulated ? 450 + Math.random() * 550 : 180);
          }
          const detail = describeResult(spec, fileName);
          patchJob(id, { status: "succeeded", stage: "Done", progress: 100, finishedAt: new Date().toISOString(), detail });
          if (trigger !== "manual") notify(`${trigger === "schedule" ? "Scheduled export" : "Backup"} complete · ${detail}`);
        } catch (err) {
          const error = err instanceof Error ? err.message : "Export failed";
          patchJob(id, { status: "failed", stage: "Failed", error, finishedAt: new Date().toISOString() });
          notify(error, "error");
        }
      })();

      return id;
    },
    [notify, patchJob],
  );

  const connect = useCallback((id: DestinationId) => {
    setState((s) => ({ ...s, connections: { ...s.connections, [id]: { account: simulatedAccount(id), connectedAt: new Date().toISOString() } } }));
  }, []);

  const disconnect = useCallback((id: DestinationId) => {
    setState((s) => {
      const connections = { ...s.connections };
      delete connections[id];
      return { ...s, connections };
    });
  }, []);

  const saveSchedule = useCallback<CloudContextValue["saveSchedule"]>((input) => {
    setState((s) => {
      const nextRunAt = computeNextRun(input).toISOString();
      if (input.id) {
        return { ...s, schedules: s.schedules.map((x) => (x.id === input.id ? { ...x, ...input, id: x.id, nextRunAt } : x)) };
      }
      const created: Schedule = { ...input, id: generateId(), createdAt: new Date().toISOString(), nextRunAt };
      return { ...s, schedules: [...s.schedules, created] };
    });
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      schedules: s.schedules.map((x) => (x.id === id ? { ...x, active: !x.active, nextRunAt: computeNextRun(x).toISOString() } : x)),
    }));
  }, []);

  const deleteSchedule = useCallback((id: string) => setState((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) })), []);

  const runScheduleNow = useCallback(
    (id: string) => {
      const sched = stateRef.current.schedules.find((x) => x.id === id);
      if (!sched) return;
      runExport(sched.spec, "schedule", id);
      setState((s) => ({ ...s, schedules: s.schedules.map((x) => (x.id === id ? { ...x, lastRunAt: new Date().toISOString() } : x)) }));
    },
    [runExport],
  );

  // Scheduler: runs due exports while any Ledgerly tab is open. Missed runs catch up once.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const now = new Date();
      const due = stateRef.current.schedules.filter((s) => s.active && new Date(s.nextRunAt) <= now);
      if (!due.length) return;
      for (const s of due) runExport(s.spec, "schedule", s.id);
      setState((st) => ({
        ...st,
        schedules: st.schedules.map((s) =>
          due.some((d) => d.id === s.id) ? { ...s, lastRunAt: now.toISOString(), nextRunAt: computeNextRun(s, now).toISOString() } : s,
        ),
      }));
    };
    tick();
    const t = setInterval(tick, SCHEDULER_TICK_MS);
    return () => clearInterval(t);
  }, [hydrated, runExport]);

  const addShare = useCallback((link: ShareLink) => setState((s) => ({ ...s, shares: [link, ...s.shares] })), []);
  const removeShare = useCallback((id: string) => setState((s) => ({ ...s, shares: s.shares.filter((x) => x.id !== id) })), []);
  const clearHistory = useCallback(() => setState((s) => ({ ...s, jobs: s.jobs.filter((j) => j.status === "running" || j.status === "queued") })), []);

  const lastBackupAt = useMemo(
    () => state.jobs.find((j) => j.spec.templateId === "full-backup" && j.status === "succeeded")?.finishedAt ?? null,
    [state.jobs],
  );
  const pendingChanges = useMemo(
    () => (lastBackupAt ? expenses.filter((e) => e.updatedAt > lastBackupAt).length : expenses.length),
    [expenses, lastBackupAt],
  );
  const activeJobs = useMemo(() => state.jobs.filter((j) => j.status === "queued" || j.status === "running"), [state.jobs]);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...state,
      hydrated,
      runExport,
      connect,
      disconnect,
      saveSchedule,
      toggleSchedule,
      deleteSchedule,
      runScheduleNow,
      addShare,
      removeShare,
      clearHistory,
      lastBackupAt,
      pendingChanges,
      activeJobs,
    }),
    [state, hydrated, runExport, connect, disconnect, saveSchedule, toggleSchedule, deleteSchedule, runScheduleNow, addShare, removeShare, clearHistory, lastBackupAt, pendingChanges, activeJobs],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used within CloudProvider");
  return ctx;
}
