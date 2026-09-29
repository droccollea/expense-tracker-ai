import type { Category } from "../types";

export type TemplateId = "monthly-summary" | "tax-report" | "category-analysis" | "full-backup";
export type FileFormat = "csv" | "json";
export type DestinationId = "download" | "email" | "google-sheets" | "dropbox" | "onedrive" | "notion" | "slack";
export type PeriodId = "this-month" | "last-month" | "last-3-months" | "last-6-months" | "this-year" | "last-year" | "all";
export type Frequency = "daily" | "weekly" | "monthly";

/** A tabular result produced by a template, independent of output format. */
export interface Dataset {
  title: string;
  subtitle: string;
  /** Overrides the default "<title> - <subtitle>" file name (without extension). */
  fileBase?: string;
  columns: { key: string; label: string; align?: "right" }[];
  rows: Record<string, string | number>[];
  /** Number of underlying expenses the report covers. */
  recordCount: number;
  totalCents: number;
}

/** Destination-specific settings captured in the composer. */
export interface DestinationSettings {
  recipients?: string[];
  subject?: string;
  message?: string;
  folder?: string;
  sheetMode?: "new" | "append";
  sheetName?: string;
  channel?: string;
}

export interface ExportSpec {
  templateId: TemplateId;
  period: PeriodId;
  format: FileFormat;
  destination: DestinationId;
  settings: DestinationSettings;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ExportJob {
  id: string;
  spec: ExportSpec;
  trigger: "manual" | "schedule" | "backup";
  scheduleId?: string;
  status: JobStatus;
  stage: string;
  progress: number;
  createdAt: string;
  finishedAt?: string;
  fileName?: string;
  records?: number;
  bytes?: number;
  checksum?: string;
  detail?: string;
  error?: string;
}

export interface Schedule {
  id: string;
  name: string;
  spec: ExportSpec;
  frequency: Frequency;
  /** 0 = Sunday … 6 = Saturday (weekly) */
  weekday: number;
  /** 1–28 (monthly) */
  dayOfMonth: number;
  /** HH:MM, local time */
  time: string;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
}

export interface Connection {
  account: string;
  connectedAt: string;
}

export interface ShareLink {
  id: string;
  title: string;
  url: string;
  templateId: TemplateId;
  period: PeriodId;
  includeTransactions: boolean;
  createdAt: string;
  expiresAt: string | null;
  bytes: number;
}

/** Compact, self-contained snapshot embedded in a share link. */
export interface ShareSnapshot {
  v: 1;
  title: string;
  note?: string;
  author?: string;
  createdAt: string;
  expiresAt: string | null;
  period: { label: string; from: string | null; to: string | null };
  totalCents: number;
  count: number;
  byCategory: [Category, number, number][]; // [category, cents, count]
  byMonth: [string, number][]; // [YYYY-MM, cents]
  rows?: [string, Category, number, string][]; // [date, category, cents, description]
}
