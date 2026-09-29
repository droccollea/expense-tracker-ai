import { CATEGORIES, type Expense } from "../types";
import { monthKey } from "../format";
import { inPeriod } from "./templates";
import { periodLabel, periodRange } from "./period";
import type { PeriodId, ShareSnapshot } from "./types";

export function buildSnapshot(
  expenses: Expense[],
  opts: { title: string; note?: string; author?: string; period: PeriodId; includeTransactions: boolean; expiresInDays: number | null },
): ShareSnapshot {
  const rows = inPeriod(expenses, opts.period).sort((a, b) => b.date.localeCompare(a.date));
  const byCat = new Map(CATEGORIES.map((c) => [c, [0, 0]]));
  const byMonth = new Map<string, number>();
  for (const e of rows) {
    const b = byCat.get(e.category)!;
    b[0] += e.amountCents;
    b[1]++;
    const k = monthKey(e.date);
    byMonth.set(k, (byMonth.get(k) ?? 0) + e.amountCents);
  }
  const now = new Date();
  const range = periodRange(opts.period);
  return {
    v: 1,
    title: opts.title.trim() || "Spending report",
    note: opts.note?.trim() || undefined,
    author: opts.author?.trim() || undefined,
    createdAt: now.toISOString(),
    expiresAt: opts.expiresInDays ? new Date(now.getTime() + opts.expiresInDays * 86_400_000).toISOString() : null,
    period: { label: periodLabel(opts.period), ...range },
    totalCents: rows.reduce((s, e) => s + e.amountCents, 0),
    count: rows.length,
    byCategory: [...byCat].filter(([, [c]]) => c > 0).map(([cat, [cents, n]]) => [cat, cents, n]),
    byMonth: [...byMonth].sort(([a], [b]) => a.localeCompare(b)),
    rows: opts.includeTransactions ? rows.map((e) => [e.date, e.category, e.amountCents, e.description]) : undefined,
  };
}

// ---- compact encoding: JSON → deflate → base64url, stored in the URL fragment (never sent to a server) ----

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(s: ShareSnapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(s));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeSnapshot(token: string): Promise<ShareSnapshot> {
  const bytes = await pipe(fromBase64Url(token), new DecompressionStream("deflate-raw"));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (data?.v !== 1 || typeof data.totalCents !== "number" || !Array.isArray(data.byCategory)) throw new Error("Unsupported link");
  return data as ShareSnapshot;
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/share#r=${token}`;
}

/** QR version 40-L tops out around 2,900 bytes; stay well below for reliable phone scanning. */
export const QR_SAFE_LENGTH = 1800;
