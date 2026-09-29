"use client";

import { useEffect, useReducer } from "react";
import { CATEGORIES, type Category } from "@/lib/types";
import { toISODate } from "@/lib/format";
import {
  EXPORT_COLUMNS,
  defaultFilename,
  type ExportColumn,
  type ExportFormatId,
  type ExportOptions,
  type SortOrder,
} from "@/lib/export";

export type RangePreset = "all" | "month" | "30d" | "90d" | "year" | "custom";

export const RANGE_PRESETS: { id: Exclude<RangePreset, "custom">; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "Year to date" },
];

export function presetRange(id: Exclude<RangePreset, "custom">, now = new Date()): [string, string] {
  const today = toISODate(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (id) {
    case "all":
      return ["", ""];
    case "month":
      return [toISODate(new Date(y, m, 1)), today];
    case "30d":
      return [toISODate(new Date(y, m, d - 29)), today];
    case "90d":
      return [toISODate(new Date(y, m, d - 89)), today];
    case "year":
      return [toISODate(new Date(y, 0, 1)), today];
  }
}

export interface ExportState extends ExportOptions {
  preset: RangePreset;
}

export interface ExportSeed {
  from?: string;
  to?: string;
  categories?: Category[];
}

export type ExportAction =
  | { type: "reset"; seed?: ExportSeed; prefs: Prefs }
  | { type: "format"; format: ExportFormatId }
  | { type: "preset"; preset: Exclude<RangePreset, "custom"> }
  | { type: "from" | "to"; value: string }
  | { type: "toggleCategory"; category: Category }
  | { type: "categories"; categories: Category[] }
  | { type: "toggleColumn"; column: ExportColumn }
  | { type: "sort"; sort: SortOrder }
  | { type: "filename"; filename: string };

type Prefs = Pick<ExportOptions, "format" | "columns" | "sort">;
const PREFS_KEY = "ledgerly-export-prefs";
const DEFAULT_PREFS: Prefs = { format: "csv", columns: [...EXPORT_COLUMNS], sort: "date-desc" };

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null");
    if (!p) return DEFAULT_PREFS;
    return {
      format: ["csv", "json", "pdf"].includes(p.format) ? p.format : DEFAULT_PREFS.format,
      columns: Array.isArray(p.columns) && p.columns.length ? EXPORT_COLUMNS.filter((c) => p.columns.includes(c)) : DEFAULT_PREFS.columns,
      sort: ["date-desc", "date-asc", "amount-desc"].includes(p.sort) ? p.sort : DEFAULT_PREFS.sort,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function initialState(prefs: Prefs, seed?: ExportSeed): ExportState {
  const from = seed?.from ?? "";
  const to = seed?.to ?? "";
  return {
    ...prefs,
    from,
    to,
    preset: from || to ? "custom" : "all",
    categories: seed?.categories?.length ? seed.categories : [...CATEGORIES],
    filename: defaultFilename(),
  };
}

function reducer(state: ExportState, action: ExportAction): ExportState {
  switch (action.type) {
    case "reset":
      return initialState(action.prefs, action.seed);
    case "format":
      return { ...state, format: action.format };
    case "preset": {
      const [from, to] = presetRange(action.preset);
      return { ...state, preset: action.preset, from, to };
    }
    case "from":
    case "to":
      return { ...state, [action.type]: action.value, preset: "custom" };
    case "toggleCategory": {
      const has = state.categories.includes(action.category);
      const next = has ? state.categories.filter((c) => c !== action.category) : [...state.categories, action.category];
      return { ...state, categories: CATEGORIES.filter((c) => next.includes(c)) };
    }
    case "categories":
      return { ...state, categories: action.categories };
    case "toggleColumn": {
      const has = state.columns.includes(action.column);
      if (has && state.columns.length === 1) return state; // keep at least one column
      const next = has ? state.columns.filter((c) => c !== action.column) : [...state.columns, action.column];
      return { ...state, columns: EXPORT_COLUMNS.filter((c) => next.includes(c)) };
    }
    case "sort":
      return { ...state, sort: action.sort };
    case "filename":
      return { ...state, filename: action.filename };
  }
}

export function useExportOptions() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(DEFAULT_PREFS));

  // Remember format/columns/sort between sessions.
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ format: state.format, columns: state.columns, sort: state.sort }));
    } catch {
      /* preferences are a convenience; ignore storage failures */
    }
  }, [state.format, state.columns, state.sort]);

  const reset = (seed?: ExportSeed) => dispatch({ type: "reset", seed, prefs: loadPrefs() });

  return { state, dispatch, reset };
}
