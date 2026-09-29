"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { decodeSnapshot } from "@/lib/cloud/share";
import type { ShareSnapshot } from "@/lib/cloud/types";
import { CATEGORY_STYLES } from "@/lib/types";
import { formatCurrency, formatDate, formatMonthKey } from "@/lib/format";

type View = { kind: "loading" } | { kind: "invalid" } | { kind: "expired"; snap: ShareSnapshot } | { kind: "ok"; snap: ShareSnapshot };

/** Public, read-only report rendered entirely from the URL fragment. */
export default function SharedReportPage() {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    const load = () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("r");
      if (!token) return setView({ kind: "invalid" });
      decodeSnapshot(token)
        .then((snap) => setView(snap.expiresAt && new Date(snap.expiresAt) < new Date() ? { kind: "expired", snap } : { kind: "ok", snap }))
        .catch(() => setView({ kind: "invalid" }));
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4 sm:px-6">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">L</span>
          <span className="font-semibold text-slate-900">Ledgerly</span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Shared report · read-only</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {view.kind === "loading" ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        ) : view.kind === "invalid" ? (
          <Notice icon="🔍" title="This link isn't valid" body="It may have been cut off when it was copied. Ask the sender for the full link." />
        ) : view.kind === "expired" ? (
          <Notice icon="⌛" title="This report has expired" body={`“${view.snap.title}” was available until ${new Date(view.snap.expiresAt!).toLocaleString()}. Ask the sender for a new link.`} />
        ) : (
          <Report snap={view.snap} />
        )}
      </main>
    </div>
  );
}

function Report({ snap }: { snap: ShareSnapshot }) {
  const [q, setQ] = useState("");
  const maxCat = Math.max(1, ...snap.byCategory.map(([, c]) => c));
  const maxMonth = Math.max(1, ...snap.byMonth.map(([, c]) => c));
  const rows = useMemo(
    () => (snap.rows ?? []).filter(([, cat, , desc]) => !q || `${cat} ${desc}`.toLowerCase().includes(q.toLowerCase())),
    [snap.rows, q],
  );

  function downloadCsv() {
    const lines = [["Date", "Category", "Amount", "Description"], ...(snap.rows ?? []).map(([d, c, cents, desc]) => [d, c, (cents / 100).toFixed(2), desc])];
    const csv = lines.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `${snap.title}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-600">{snap.period.label}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{snap.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {snap.author ? <>Shared by <b className="text-slate-700">{snap.author}</b> · </> : null}
          {new Date(snap.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          {snap.expiresAt && <> · available until {new Date(snap.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</>}
        </p>
        {snap.note && <p className="mt-4 rounded-xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-slate-700">{snap.note}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Total spent" value={formatCurrency(snap.totalCents)} />
        <Tile label="Transactions" value={String(snap.count)} />
        <Tile label="Average" value={formatCurrency(snap.count ? Math.round(snap.totalCents / snap.count) : 0)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">By category</h2>
          <ul className="mt-4 space-y-3">
            {snap.byCategory.map(([cat, cents, n]) => (
              <li key={cat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{cat} <span className="text-xs text-slate-400">· {n}</span></span>
                  <span className="tabular-nums text-slate-900">{formatCurrency(cents)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full" style={{ width: `${(cents / maxCat) * 100}%`, backgroundColor: CATEGORY_STYLES[cat].color }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">By month</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {snap.byMonth.map(([k, cents]) => (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${formatMonthKey(k, "long")}: ${formatCurrency(cents)}`}>
                <div className="w-full max-w-10 rounded-t bg-brand-500" style={{ height: `${(cents / maxMonth) * 100}%`, minHeight: 3 }} />
                <span className="text-[10px] text-slate-500">{formatMonthKey(k)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {snap.rows && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="flex-1 text-sm font-semibold text-slate-900">Transactions</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search transactions" className="input w-40 py-1.5" />
            <button onClick={downloadCsv} className="btn-secondary px-3 py-1.5 text-xs">Download CSV</button>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {rows.map(([d, cat, cents, desc], i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">{formatDate(d)}</td>
                    <td className="px-4 py-2 text-slate-800">{desc}</td>
                    <td className="hidden px-4 py-2 text-xs text-slate-500 sm:table-cell">{cat}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{formatCurrency(cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
        This report lives entirely inside its link, so it isn&apos;t stored on any server.{" "}
        <Link href="/" className="font-medium text-brand-600">Track your own spending with Ledgerly →</Link>
      </footer>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-3xl" aria-hidden>{icon}</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}
