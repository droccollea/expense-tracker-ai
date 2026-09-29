"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useExpenses } from "@/hooks/useExpenses";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { PERIODS } from "@/lib/cloud/period";
import { QR_SAFE_LENGTH, buildSnapshot, encodeSnapshot, shareUrl } from "@/lib/cloud/share";
import { formatBytes } from "@/lib/cloud/serialize";
import type { PeriodId, ShareLink } from "@/lib/cloud/types";
import { generateId } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";
import { Pill } from "./Composer";
import { relativeTime } from "./relativeTime";

const EXPIRY: { label: string; days: number | null }[] = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "Never", days: null },
];

export function SharePanel() {
  const { expenses } = useExpenses();
  const { shares, addShare, removeShare } = useCloud();
  const { notify } = useToast();
  const [title, setTitle] = useState("Our household spending");
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState("");
  const [period, setPeriod] = useState<PeriodId>("last-3-months");
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [expiry, setExpiry] = useState<number | null>(7);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShareLink | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const preview = buildSnapshot(expenses, { title, period, includeTransactions, expiresInDays: expiry });

  useEffect(() => {
    if (!result || result.url.length > QR_SAFE_LENGTH) return setQr(null);
    QRCode.toString(result.url, { type: "svg", margin: 1, errorCorrectionLevel: "L", color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [result]);

  async function create() {
    setBusy(true);
    try {
      const snap = buildSnapshot(expenses, { title, note, author, period, includeTransactions, expiresInDays: expiry });
      const url = shareUrl(await encodeSnapshot(snap));
      const link: ShareLink = { id: generateId(), title: snap.title, url, templateId: "monthly-summary", period, includeTransactions, createdAt: snap.createdAt, expiresAt: snap.expiresAt, bytes: url.length };
      addShare(link);
      setResult(link);
    } catch {
      notify("Couldn't create the link in this browser.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied to clipboard");
    } catch {
      notify("Clipboard unavailable — select the link and copy it manually.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="font-semibold text-slate-900">Create a read-only report link</p>
            <p className="mt-0.5 text-xs text-slate-500">Recipients see a live dashboard — no account needed.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">From (optional)</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} placeholder="Your name" className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="For our budget chat on Sunday" className="input" />
            </label>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Period</span>
            <div className="flex flex-wrap gap-1.5">
              {PERIODS.map((p) => <Pill key={p.id} active={p.id === period} onClick={() => setPeriod(p.id)}>{p.label}</Pill>)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Link expires</span>
              <div className="flex flex-wrap gap-1.5">
                {EXPIRY.map((x) => <Pill key={x.label} active={x.days === expiry} onClick={() => setExpiry(x.days)}>{x.label}</Pill>)}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-slate-50 p-3">
              <input type="checkbox" checked={includeTransactions} onChange={(e) => setIncludeTransactions(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span className="text-xs">
                <span className="block font-medium text-slate-800">Include individual transactions</span>
                <span className="text-slate-500">Off = totals only. Keeps descriptions private and the link short.</span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              {preview.count} expenses · {formatCurrency(preview.totalCents)} · {preview.byCategory.length} categories
            </p>
            <button onClick={create} disabled={busy || preview.count === 0} className="btn-primary">
              {busy ? "Compressing…" : "🔗 Create link"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5">
          {result ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-900">✓ Link ready</p>
              <div className="flex gap-2">
                <input readOnly value={result.url} onFocus={(e) => e.target.select()} aria-label="Share link" className="input font-mono text-xs" />
                <button onClick={() => copy(result.url)} className="btn-primary shrink-0 px-3">Copy</button>
              </div>
              <div className="flex justify-center">
                {qr ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="h-44 w-44 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code for the share link" />
                    <p className="mt-2 text-center text-[11px] text-slate-500">Scan to open on a phone</p>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                    This link is too long for a reliable QR code ({formatBytes(result.bytes)}). Turn off “Include individual transactions” for a scannable code.
                  </p>
                )}
              </div>
              <div className="flex justify-between text-xs">
                <a href={result.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:text-brand-700">Open preview ↗</a>
                <span className="text-slate-500">{result.expiresAt ? `Expires ${relativeTime(result.expiresAt)}` : "Never expires"}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <p className="text-3xl" aria-hidden>🔗</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Share without uploading</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                The report is compressed into the link itself, after the <code className="rounded bg-slate-100 px-1">#</code>. Browsers never send that part to a server, so your data isn&apos;t stored anywhere but the link.
              </p>
            </div>
          )}
        </div>
      </div>

      {shares.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your links</p>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {shares.map((s) => {
              const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {PERIODS.find((p) => p.id === s.period)?.label} · {s.includeTransactions ? "with transactions" : "totals only"} · created {relativeTime(s.createdAt)} ·{" "}
                      <span className={expired ? "text-red-600" : ""}>{s.expiresAt ? (expired ? "expired" : `expires ${relativeTime(s.expiresAt)}`) : "no expiry"}</span>
                    </p>
                  </div>
                  <button onClick={() => copy(s.url)} className="text-xs font-medium text-brand-600">Copy</button>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-600">Open</a>
                  <button onClick={() => removeShare(s.id)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            Because each link contains its own data, removing it here only removes it from this list — copies you&apos;ve already sent keep working until they expire.
          </p>
        </div>
      )}
    </div>
  );
}
