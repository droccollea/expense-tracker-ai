"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useExportOptions, type ExportSeed } from "@/hooks/useExportOptions";
import { ExportDrawer } from "./ExportDrawer";

interface ExportCenterValue {
  openExport: (seed?: ExportSeed) => void;
}

const ExportCenterContext = createContext<ExportCenterValue | null>(null);

export function ExportCenterProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { expenses } = useExpenses();
  const options = useExportOptions();
  const { reset } = options;

  const openExport = useCallback(
    (seed?: ExportSeed) => {
      reset(seed);
      setOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Power-user shortcut: Ctrl/⌘ + Shift + E
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (!open) openExport();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openExport]);

  return (
    <ExportCenterContext.Provider value={{ openExport }}>
      {children}
      <ExportDrawer open={open} onClose={() => setOpen(false)} expenses={expenses} {...options} />
    </ExportCenterContext.Provider>
  );
}

export function useExportCenter(): ExportCenterValue {
  const ctx = useContext(ExportCenterContext);
  if (!ctx) throw new Error("useExportCenter must be used within ExportCenterProvider");
  return ctx;
}
