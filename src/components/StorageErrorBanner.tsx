"use client";

import { useExpenses } from "@/hooks/useExpenses";

export function StorageErrorBanner() {
  const { error, clearAll } = useExpenses();
  if (!error) return null;
  return (
    <div role="alert" className="border-b border-red-200 bg-red-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 text-sm text-red-800 sm:px-6">
        <span className="font-semibold">Storage problem:</span>
        <span className="flex-1">{error}</span>
        <button onClick={() => window.location.reload()} className="font-medium underline">
          Retry
        </button>
        <button onClick={clearAll} className="font-medium underline">
          Reset data
        </button>
      </div>
    </div>
  );
}
