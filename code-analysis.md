# Data Export — Code Analysis of Three Implementations

**Repository:** `expense-tracker-ai` · **Baseline:** `main` @ `e224d1b` · **Analysed:** 2026-09-29

| Branch | Commit | Diff vs `main` | New runtime deps |
|---|---|---|---|
| `feature-data-export-v1` | `77fd006` | 2 files, +12 / −6 | none |
| `feature-data-export-v2` | `fc7decb` | 23 files, +1,330 / −54 | `jspdf@2.5.2`, `jspdf-autotable@3.8.4` |
| `feature-data-export-v3` | `aa47d4f` | 36 files, +2,959 / −69 | `qrcode@1.5.4` (+ `@types/qrcode`) |

---

## 1. Summary

**What each version is**

- **V1** adds a dashboard button that exports every expense to CSV. It reuses the CSV helper already on `main`, which the Expenses page already used for its export.
- **V2** is a local export system with a clear internal structure: one export module per format behind a shared interface, a side drawer holding its state in a reducer, filtering, a live preview, and a PDF report.
- **V3** is a large set of product features:
  - report templates, background jobs, schedules, export history and sync status;
  - read-only share links that work without a server;
  - six *simulated* destinations: email plus five services (Google Sheets, Dropbox, OneDrive, Notion, Slack).

**Headline findings** (every one below was confirmed by running the code; see §2)

1. **V2 depends on jsPDF 2.5.2, which has critical and high advisories.** `npm audit` flags it, and the fix is a major upgrade to `jspdf@4.2.1` and `jspdf-autotable@5.x`. Most advisories concern APIs we don't call (`addImage`, `addJS`, AcroForm, `html()`, Node file access), so real exploitability is low. Even so, the branch fails a typical CI audit gate as written.
2. **V2's "remember my export settings" feature doesn't work across reloads.** The saved settings are overwritten with the defaults on every page load.
3. **V2's PDF corrupts any description containing characters outside Windows-1252.** One such character (CJK or emoji) garbles the whole cell, including the ordinary Latin letters in it.
4. **V3 has multi-tab defects.**
   - When two tabs open at the same time, both run the same due schedule, so the export is delivered twice.
   - A tab holding stale state overwrites changes made in another tab, such as newly created share links.
5. **V3's share-link viewer trusts link data it shouldn't.**
   - A malformed link crashes it, because the decoded data is barely validated.
   - Its "Download CSV" button writes descriptions without the formula-injection guard, so a crafted link can put live spreadsheet formulas into the recipient's file.
   - Link expiry is enforced only in the UI; the data can be decoded offline.
6. **Baseline, all branches (including `main`):** `next@14.2.33` has a critical advisory rollup with no fix on the 14.x line. The fix is Next 16, a major upgrade. This predates the export work.

**Scorecard** (1 = poor, 5 = strong)

| Dimension | V1 | V2 | V3 |
|---|---|---|---|
| Feature completeness vs. its own brief | 5 | 5 | 4 (most integrations are simulated by design) |
| Real, working functionality | 2 (duplicates an existing export) | 5 | 3 |
| Architecture / separation of concerns | 3 | 5 | 4 |
| Complexity cost | 5 (trivial) | 3 | 2 |
| Error handling | 2 | 4 | 3 |
| Security posture | 4 | 2 (jsPDF advisories) | 2 (unvalidated link data, CSV formula injection) |
| Performance | 5 | 4 | 3 |
| Extensibility | 2 | 5 | 4 |
| Test evidence | 1 manual check | 28 automated checks | 42 automated checks |

---

## 2. Method and verified defects

**How the analysis was done**

- **Inspection:** each branch was inspected with `git diff main...<branch>` and `git show`, which gives the same content as checking the branch out, without changing the working tree.
- **Execution:** for anything that needed running, V2 and V3 were unpacked with `git archive` into scratch folders, installed with `npm ci`, built, and served side by side.
- **Dependencies:** `npm audit --omit=dev` was run against each branch's lockfile.

**Labels used in this document**

- ✅ **Verified** means reproduced in a real browser (Playwright + Chromium).
- 🔎 **By inspection** means found by reading the code, not executed.

| ID | Version | Defect | Severity | Evidence |
|---|---|---|---|---|
| V2-1 | V2 | Saved export settings are overwritten with defaults on every page load | Medium (the feature doesn't work) | ✅ Settings stored as `{"format":"pdf","sort":"amount-desc"}`. After a reload they read `{"format":"csv","sort":"date-desc"}` and the drawer reopened on CSV. |
| V2-2 | V2 | PDF garbles descriptions containing non-Windows-1252 characters | Medium | ✅ Exported `Café 寿司 Ümlaut €`. The PDF text layer reads `C\0a\0f\0é\0 [ÿSø\0 …`, so even the Latin letters are corrupted. |
| V2-3 | V2 | jsPDF 2.5.2 / autotable 3.8.4 fall inside advisory ranges (critical, high and moderate, including DOMPurify via jsPDF) | High for CI, Low for exploitability | ✅ `npm audit`. The fix is `jspdf@4.2.1` / `jspdf-autotable@5.0.8`, both semver-major. |
| V3-1 | V3 | Two tabs opened together both run a due schedule, so it's delivered twice | Medium | ✅ With one due schedule: tab 1 ran 1 job and tab 2 ran 1 job. A tab opened *later* does not re-run it, because `nextRunAt` has already advanced. |
| V3-2 | V3 | A tab with stale state overwrites another tab's cloud state | Medium (data loss) | ✅ Tab A created 2 share links. Tab B had loaded between those two creations; when it connected a service, storage was left with 1 link. |
| V3-3 | V3 | A share link with an unexpected category crashes the viewer | Low–Medium | ✅ `TypeError: Cannot read properties of undefined (reading 'color')`, which triggers the app's error page. |
| V3-4 | V3 | Share-link expiry is advisory only | Low (but the UI implies a guarantee) | ✅ The viewer correctly shows "expired", but one `zlib.inflateRawSync` call on the same token recovers the full data. |
| V3-5 | V3 | Clearing history, or pushing more than 50 jobs, erases "last backup" status | Low | 🔎 `lastBackupAt` is derived from `jobs` (`useCloud.tsx:228`). `clearHistory` and `MAX_HISTORY` (line 14 / 118) can remove the backup job, after which the navbar says "Not backed up". |
| V3-6 | V3 | The share viewer's "Download CSV" has no formula-injection guard, so data from someone else's link can inject spreadsheet formulas | Medium (security) | ✅ A link whose description is `=HYPERLINK("https://example.invalid","Receipt")` downloaded as `…,"=HYPERLINK(""https://example.invalid"",""Receipt"")"`. Quoting doesn't stop evaluation; only the `'` prefix does. The viewer's own writer (`app/share/page.tsx:64`) skips the guard in `lib/cloud/serialize.ts`. (Tested up to the file contents; not opened in a spreadsheet app.) |
| BASE-1 | all | `next@14.2.33` advisory rollup (DoS, request smuggling, cache poisoning, CSP-nonce XSS, …) | High (inherited) | ✅ `npm audit`. Mostly affects server features this client-only app doesn't use, but it is not patched on 14.x. |

---

## 3. Shared baseline (what all three build on)

Understanding `main` explains several findings.

- **Data layer.**
  - Expenses live in `localStorage` under `expense-tracker:v1`.
  - They are loaded and saved by `ExpensesProvider` (`src/hooks/useExpenses.tsx`), which also listens for `storage` events so multiple tabs stay in sync.
  - Amounts are integer cents and dates are local `YYYY-MM-DD` strings.
  - All three branches read expenses through `useExpenses()` and never write them.
- **App shell.** `Providers` stacks context providers (Toast → Expenses → ExpenseDialogs) around a Navbar and `<main>`. All pages are client components (`"use client"`), and the build output is fully static (`○`).
- **Existing export on `main`.**
  - `src/lib/csv.ts` provides `expensesToCSV` (RFC 4180 quoting, a formula-injection guard, and a UTF-8 BOM so Excel detects the encoding) and `downloadCSV`, which triggers a download from a Blob.
  - The Expenses page already exports the *filtered* list to CSV.
  - V1 builds on this; V2 and V3 delete it and replace it.
- **Formula-injection guard (V1 and V2).** Cells starting with `= + - @ \t \r` get a `'` prefix. That is correct for security, but it alters legitimate text such as `-50% sale`. V3 refines the rule so that signed numbers and percentages (`+12%`, `-4.50`) are left alone.

---

## 4. Version 1 — Simple CSV export

### Files created/modified
| File | Change |
|---|---|
| `src/app/page.tsx` | Adds an "Export Data" button in the dashboard header (+10/−4) |
| `src/lib/csv.ts` | Column order changed to `Date, Category, Amount, Description` (+2/−2) |

### Architecture overview
There is no new architecture. The button calls the existing `downloadCSV(sortByDateDesc(expenses))` helper inline (`src/app/page.tsx:29`).

### Key components and responsibilities
- **Dashboard page:** renders the button, which is disabled while data loads or when there are no expenses.
- **`csv.ts`:** turns expenses into CSV text and triggers the download.

### Libraries and dependencies
None added. It uses the browser's `Blob` and `URL.createObjectURL` APIs, plus a temporary `<a download>` element.

### Implementation patterns
The button calls a pure helper directly. There's no state and no abstraction layer.

### Complexity
Trivial: one expression plus a column reorder.

### Error handling
- 🔎 **No `try/catch` and no user feedback.** The dashboard handler is bare, whereas the Expenses page on `main` wraps the same call in `try/catch` and shows a toast.
- **Empty state:** handled by disabling the button.

### Security
- The CSV output is protected against formula injection.
- No data leaves the device.

### Performance
The CSV is built in one pass over the data, O(n). There are no new bundles.

### Extensibility and maintainability
- **Easy to read, but no seam to extend.** Adding formats or filters would mean restructuring the code.
- **Changing the column order is a silent format change** that also affects the Expenses-page export. Anyone who parses those files would need to know.

### Assessment
It meets its brief, but the practical value it adds over `main` is small: a second entry point that exports everything without filters.

---

## 5. Version 2 — Advanced local export

### Files created/modified
| Area | Files |
|---|---|
| Export engine (new) | `src/lib/export/{types,select,cells,filename,download,index}.ts`, `src/lib/export/formats/{csv,json,pdf}.ts` |
| State (new) | `src/hooks/useExportOptions.ts` |
| UI (new) | `src/components/export/{ExportCenter,ExportDrawer,ExportOptionsPanel,ExportPreview}.tsx` |
| Modified | `src/app/page.tsx`, `src/app/expenses/page.tsx` (old CSV button replaced), `src/components/Providers.tsx`, `src/hooks/useToast.tsx` (toasts moved bottom-left), `tailwind.config.ts` (drawer animation), `README.md`, `package.json`/lock |
| Removed | `src/lib/csv.ts` |

### Architecture overview
```
UI (ExportDrawer / OptionsPanel / Preview)
        │  dispatch(ExportAction)
        ▼
useExportOptions (useReducer + persisted prefs)
        │  ExportOptions
        ▼
lib/export: selectForExport → summarize → runExport
        │                                   │
        ▼                                   ▼
  EXPORTERS registry ── csv / json / pdf ── saveBlob()
```
- **The engine (`lib/export`) has no dependency on React.**
- **Every format implements one `Exporter` interface:**
  - `id`, `extension`, `mimeType` and `supportsColumns`;
  - `build(payload): Promise<Blob>`.
- **`runExport`** (`lib/export/index.ts`) is the single place the pieces are joined: it sanitises the file name, builds the summary, calls the exporter, and starts the download.

### Key components
| Unit | Responsibility |
|---|---|
| `ExportCenterProvider` | Owns whether the drawer is open. Exposes `openExport(seed?)` and the ⌘/Ctrl+Shift+E shortcut. |
| `useExportOptions` | A reducer for format, date range and preset, categories, columns, sort and file name. Persists format, columns and sort. |
| `ExportDrawer` | Derives the rows and summary, validates, runs the export through its states, handles Esc and ⌘/Ctrl+Enter, and locks page scrolling. |
| `ExportOptionsPanel` | The five numbered option sections. Shows per-category counts and totals within the chosen date range. |
| `ExportPreview` | A table of the first 100 rows, or the *real* exporter's output for the first 12 rows ("Raw" tab). |
| `formats/pdf.ts` | Lazily imports jsPDF and autotable. Draws the header, summary tiles, category table, detail table and footer. |

### Libraries
- **`jspdf@2.5.2` + `jspdf-autotable@3.8.4`.**
  - They are loaded with `import()` (`pdf.ts:26`), so the dashboard's first load grows only from 107 kB to 114 kB.
  - The first PDF export downloads extra chunks of **~328 KB + ~193 KB raw (~147 KB gzipped)**.
- **⚠ Advisories (V2-3).** jsPDF ≤ 4.2.0 is flagged for ReDoS/DoS in the image decoders, PDF/JS injection through AcroForm and `addJS`, local file inclusion in the Node build, and a vulnerable DOMPurify used by `html()`.
- **Our code path** only calls `text`, `rect`, `roundedRect`, `circle` and `autoTable` with our own strings, so none of the vulnerable APIs are reached. The upgrade is still needed for hygiene and CI.

### Implementation patterns
- Strategy/registry for formats.
- A reducer with a discriminated-union action type.
- Derived data through `useMemo` (rows in range → selection → summary).
- A tagged-union `Status` (`idle | working | done | error`) drives the button label and locks the controls while an export runs.
- The preview renders the exporter's own output, so what you see is exactly what's written.

### Complexity
Moderate: about 1,300 lines across 15 modules. The individual units are small and single-purpose, the largest being `ExportOptionsPanel` at about 230 lines.

### Error handling
- **Validation**, shown inline and blocking the Export button:
  - no categories selected;
  - start date after end date;
  - a file name that is empty after sanitising;
  - zero matching rows (shown as an empty state).
- **Runtime:** `try/catch` around `runExport` shows an error status. 🔎 It displays `err.message` verbatim, so an offline failure to load the PDF chunk would show a technical message such as "Failed to fetch dynamically imported module".
- **Busy state:** Esc, backdrop clicks and inputs are disabled while an export runs.

### Security
- **Formula-injection guard:** present in CSV.
- **File names:** sanitised (illegal characters, a typed extension, leading dots, a length cap). 🔎 Windows reserved names such as `CON` and `NUL` aren't handled, though browsers sanitise download names anyway.
- **External calls:** none. Everything stays on the device.
- **jsPDF advisories:** see above.

### Performance
- **PDF generation runs on the main thread,** so it freezes the UI for large datasets (thousands of rows).
- The preview table is capped at 100 rows, and the Raw preview builds only 12.
- 🔎 The keyboard effect in `ExportDrawer.tsx:64` has no dependency array, so it re-subscribes on every render. The cost is negligible, but it's a code smell.

### Defects
- **V2-1: settings not remembered.**
  - `useExportOptions` creates its initial state from `DEFAULT_PREFS` (line 130).
  - The persistence effect (line 132) runs on mount and writes those defaults to storage before anything reads the saved values.
  - Settings therefore only "remember" within one page session.
  - Fix: seed the reducer from `loadPrefs()` inside the lazy initialiser, or skip the first write.
- **V2-2: PDF corrupts non-Latin text.** jsPDF's built-in Helvetica only covers Windows-1252. Fix: embed a Unicode TTF subset (with `addFont`), which adds bundle size, or strip and transliterate unsupported characters.
- 🔎 **Minor code smells:**
  - an `eslint-disable` covering the `useCallback` deps in `ExportCenter.tsx:25`, working around a `reset` function that isn't memoised;
  - an unused `reset` prop on `ExportDrawer` (line 21).
- 🔎 **Accessibility:**
  - The drawer uses `aria-modal` but doesn't trap focus, so Tab can reach the page behind it. The shared `Modal` component has the same gap.
  - Format and column choices use `aria-checked` and `aria-pressed` correctly.

### Extensibility and maintainability
**Strongest of the three.**
- Adding a format means adding one file and one registry entry.
- The engine can be unit-tested without React, and the option types are central.

### Assessment
It's the best-engineered and entirely real. Before adopting it, fix V2-1, upgrade or replace jsPDF, and decide what to do about V2-2.

---

## 6. Version 3 — Cloud-integrated export hub

### Files created/modified
| Area | Files |
|---|---|
| Domain (new) | `src/lib/cloud/{types,period,templates,destinations,serialize,schedule,share}.ts` |
| State (new) | `src/hooks/useCloud.tsx` (provider, job runner, scheduler, persistence) |
| UI (new) | `src/components/cloud/{Composer,DestinationPreview,ConnectDialog,ServiceTile,SharePanel,Schedules,History,Integrations,Insights,SyncIndicator,ActivityTray,relativeTime}.tsx/ts` |
| Routes | **Moved** `app/page.tsx` → `app/(app)/page.tsx` and `app/expenses` → `app/(app)/expenses`. **New** `app/(app)/layout.tsx`, `app/(app)/exports/page.tsx`, and a public `app/share/page.tsx`. |
| Modified | `app/layout.tsx` (no longer wraps in Providers), `Navbar.tsx` (Exports link + sync pill; labels hidden on phones), `Providers.tsx` (CloudProvider + ActivityTray), `Icons.tsx`, `globals.css` (`.input`), `useToast.tsx`, `not-found.tsx`, `README.md`, `package.json`/lock |
| Removed | `src/lib/csv.ts` |

### Architecture overview
```
Composer / Schedules / Insights / SyncIndicator
            │ runExport(spec, trigger)
            ▼
CloudProvider (useCloud) ── persisted state {connections, jobs, schedules, shares}
   │   job runner: stages[] per destination, progress patches
   │   scheduler: setInterval(20s) → due schedules → runExport
   ▼
Template.build(expenses, period) → Dataset{columns, rows}
   → serialize(csv|json) → sha256 → (download | simulated delivery)

SharePanel → buildSnapshot → deflate-raw → base64url → /share#r=<token>
/share (no app providers) → decode → validate (minimal) → render report
```
- **Two layers of abstraction:**
  - **Templates** turn expenses into a format-neutral `Dataset`.
  - **Destinations** are a data-driven catalogue of names, colours, simulated/real flags, connection requirements and pipeline stage labels.
- **An export is a persisted `ExportJob`** with a status, stage, progress, checksum and trigger (`manual | schedule | backup`).

### Key components
| Unit | Responsibility |
|---|---|
| `useCloud` | Owns the cloud state. Runs jobs asynchronously with patch updates, runs the scheduler and catches up missed runs, derives `lastBackupAt`, `pendingChanges` and `activeJobs`. Marks jobs interrupted by a reload as failed. |
| `templates.ts` | Monthly Summary (month-over-month change), Tax Report (subtotal and TOTAL rows), Category Analysis, Full Backup. |
| `destinations.ts` | Catalogue of 7 destinations. Only `download` is real. |
| `Composer` + `DestinationPreview` | The three-step send flow, with a preview specific to each destination (email, spreadsheet grid, Slack message, Notion page, file). |
| `share.ts` + `app/share/page.tsx` | Builds the snapshot, compresses and encodes it with `CompressionStream`/`DecompressionStream`, and renders the public viewer. |
| `Schedules` | Presets, create/edit form with a next-run preview, pause/resume, run now. |
| `History` | Metrics, filters, SHA-256 copy, re-run. |
| `ConnectDialog` | A simulated OAuth consent flow. |
| `SyncIndicator`, `ActivityTray`, `Insights` | Ambient status and prompts. |

### Libraries
- **`qrcode@1.5.4`:** about 8 KB gzipped, inside the `/exports` chunk (the route's first load is 122 kB).
- **Browser APIs:** `CompressionStream` (Chrome 80+, Safari 16.4+, Firefox 113+), `crypto.subtle.digest` (secure contexts only; fine on localhost and HTTPS), `Intl.RelativeTimeFormat`, and `navigator.clipboard`.

### Implementation patterns
- Context plus refs (`expensesRef`, `stateRef`) so long-running async jobs see current data without stale closures.
- A data-driven destination catalogue and a template registry.
- A route group, so `/share` renders without the app's navigation.
- Honest UI labelling: a demo banner plus a "Simulated" badge on every simulated destination.

### Complexity
**High:** about 3,000 lines. The biggest concentrations are `Composer` (277), `useCloud` (266) and `Schedules` (234). The provider mixes three concerns (persistence, job execution and scheduling) that would normally be separate modules or services.

### Error handling
- **Validation:** recipients (email pattern, up to 10), sheet name when appending, folder path, Slack channel, zero-record periods.
- **Missing connections:** a job targeting a disconnected service fails with instructions ✅.
- **Interrupted jobs:** jobs cut off by a reload are marked failed with an explanation.
- **Share viewer:** handles a missing or undecodable token and expired links. It does *not* handle a structurally valid but semantically wrong payload (V3-3).
- **Storage write failures:** swallowed silently. That's acceptable for UI state, but it means history can quietly stop saving.

### Security
- **Share links** put report data in the URL fragment. It is never sent in HTTP requests or the Referer header, which is a sound design, but three caveats apply:
  - **Readable offline (V3-4):** the payload is *compressed, not encrypted*. Anyone holding the link can read it without the viewer, so expiry can't be enforced.
  - **Copies persist:** links remain in browser history, in `localStorage` (`shares`), and in any chat or email tool they're pasted into.
  - **Input validation is minimal (V3-3):** React escapes everything, so XSS is not possible. However, unexpected categories or types crash the page, and a crafted high-ratio deflate payload could exhaust the viewer tab's memory (🔎 theoretical).
- **CSV formula injection in the share viewer (V3-6).** Share links are *untrusted input* written by someone else, yet the viewer's "Download CSV" uses its own inline writer that only quotes cells. Descriptions beginning with `= + - @` reach the recipient's spreadsheet as live formulas (for example a disguised `HYPERLINK`). The app's main CSV writer (`serialize.ts`) has the guard, so this is a duplication that drifted. Fix: reuse `csvCell`.
- 🔎 **UI copy overstates security.** Simulated stage labels say "Encrypting" and "Verifying checksum" (`destinations.ts:64`) for actions that never happen. The Simulated badge softens this, but the copy should change.
- **QR code:** `dangerouslySetInnerHTML` renders the QR SVG, but the input is the app's own URL and the SVG comes from `qrcode`, so it's safe.
- **No real credentials:** nothing is handled or stored.

### Performance
- **Background timers:**
  - the scheduler every 20 s;
  - `SyncIndicator` every 30 s;
  - `ActivityTray` every 0.5 s, but only while a job is visible.
- 🔎 **`DestinationPreview` re-serialises the whole dataset on every render** (`DestinationPreview.tsx:12`), including each keystroke in the email message box. For a Full Backup of many thousands of expenses, that means building a multi-MB string and Blob per keystroke. Fix: memoise on `[ds, format]`.
- **Simulated latency:** 450–1,000 ms per stage (180 ms for local downloads).

### Defects
V3-1, V3-2, V3-3, V3-4, V3-5 and V3-6, as described in §2. Also:
- 🔎 **Unused field:** `ShareLink.templateId` is always `"monthly-summary"` (`SharePanel.tsx:52`).
- 🔎 **Mixed row types in JSON:** the Tax Report's JSON output puts subtotal and TOTAL rows in the same array as transactions, so consumers must filter out rows with `date: ""`.
- 🔎 **Scheduled downloads have no user gesture** (`useCloud.tsx:139`). Browsers may block or prompt for repeated automatic downloads (not tested).
- 🔎 **"Run again" in History re-runs against *current* data,** not a stored snapshot. That's reasonable, but the UI doesn't say so.

### Extensibility and maintainability
- **Templates and destinations are easy to add** as data.
- **Real integrations would need a backend,** covering OAuth token storage, an email provider and server-side scheduling. The current client-only `useCloud` would become a thin API client. The domain types (`ExportSpec`, `ExportJob`, `Schedule`) transfer well to that design; the job runner and scheduler don't.
- **Moving routes into a group** touches every page path, which raises merge-conflict risk against V2.

### Assessment
The richest UX, with two real innovations worth keeping: share links that need no server, and backup/sync awareness. Much of the surface area is simulated, and the client-only job and scheduler model has multi-tab correctness problems.

---

## 7. Technical deep dive — side by side

### How export works, end to end
| Step | V1 | V2 | V3 |
|---|---|---|---|
| Trigger | Button `onClick` | Drawer "Export" (or ⌘/Ctrl+Enter) | Composer action, schedule tick, "Back up now", or Insights |
| Selection | All expenses, sorted by date | `selectForExport` (date range, category set, sort) | A template's own period logic (`inPeriod`) |
| Shaping | `Expense` → fixed 4 columns | Chosen columns; `rawCell` for files, `displayCell` for the preview and PDF | `Template.build` → `Dataset{columns, rows}` (aggregates, subtotals) |
| Generation | Synchronous string build | `await exporter.build()` → Blob; PDF through a dynamically imported jsPDF | `serialize()` → string + SHA-256; then a real download or simulated stages |
| Delivery | `<a download>` + object URL | `saveBlob()` with the object URL revoked after 10 s | Download (real) or a stage-timer simulation |
| Feedback | None | Button states, toast, auto-close | Activity tray progress, toast, history entry |

### File-generation approach
- **CSV (all):** strings joined with CRLF, a UTF-8 BOM for Excel, RFC 4180 quoting, and a formula guard (numeric-aware in V3).
- **JSON (V2, V3):**
  - V2 writes a `ledgerly.expenses/v1` schema containing the filters, a summary and full records.
  - V3 writes `{report, period, generatedAt, records, total, rows}` in the template's shape.
- **PDF (V2 only):** jsPDF, US Letter in points, autotable for the category and detail tables. The footer on every page is added after layout. `showFoot: "lastPage"` keeps the total row on the last page only.
- **Share snapshot (V3):** JSON → `deflate-raw` → base64url in `location.hash`. It's about 460 characters with totals only, and about 1.2 KB for 52 transactions; the QR code is suppressed above 1,800 characters.

### User interaction
- **V1:** one click, no confirmation, no feedback.
- **V2:** a modal drawer with numbered sections and a live preview. Keyboard: Esc closes, ⌘/Ctrl+Enter exports, ⌘/Ctrl+Shift+E opens it globally. Opening it from the Expenses page carries over that page's filters.
- **V3:** a hub page with tabs synced to `?tab=`, a three-step composer, modal flows (connect, schedule), and ambient elements (navbar pill, tray, suggestion cards). Work carries on in the background while you navigate.

### State management
| | V1 | V2 | V3 |
|---|---|---|---|
| Pattern | None | `useReducer` + context for open state | One large context provider with `useState` and refs |
| Persistence | — | `localStorage` prefs (broken on reload, V2-1) | `localStorage` `ledgerly-cloud:v1` (connections, jobs ≤ 50, schedules, shares) |
| Derived data | — | `useMemo` chain | `useMemo` for backup freshness and active jobs |
| Cross-tab | — | — | **None.** No `storage` listener; the last writer wins (V3-2). |
| Async | — | One awaited export | Many concurrent fire-and-forget jobs updated by id |

### Edge cases
| Case | V1 | V2 | V3 |
|---|---|---|---|
| No expenses | Button disabled | Entry buttons disabled; empty preview | Empty state on Send and Share |
| Zero matches | n/a | Empty state + disabled export | Error message ("pick a different period") |
| Commas, quotes, newlines | Quoted ✅ | Quoted ✅ | Quoted ✅ |
| Leading `=+-@` | Prefixed (also alters text) | Same | Prefixed; signed numbers left intact. **Not guarded in the share viewer's CSV download (V3-6).** |
| Non-Latin text | CSV ✅ | CSV/JSON ✅, **PDF ❌** (V2-2) | ✅ |
| Invalid file name | n/a | Sanitised; error if empty | Generated name, sanitised |
| Inverted date range | n/a | Inline error | n/a (preset periods only) |
| Reload during an export | n/a | n/a (synchronous) | Job marked "Interrupted" ✅ |
| Multiple tabs | n/a | n/a | ❌ duplicate runs and state overwrites (V3-1, V3-2) |
| Malformed input (share link) | n/a | n/a | ❌ crash (V3-3) |

---

## 8. Combining approaches — compatibility notes

- **V2 and V3 both delete `src/lib/csv.ts`** and both edit `Providers.tsx`, `useToast.tsx`, the dashboard and the Expenses page. V3 also moves the pages into `app/(app)/`. **Merging one branch into the other directly will conflict heavily**; porting pieces by hand is cleaner.
- **Pieces that port cleanly into V2:**
  - `src/lib/cloud/share.ts` (standalone apart from `inPeriod`/`periodRange`) and `app/share/page.tsx` (needs the route-group change, or a check that hides the navbar on `/share`);
  - `sha256`/`formatBytes` from `serialize.ts`;
  - the numeric-aware CSV guard.
- **Conceptual overlap:** V2's `Exporter` (format) and V3's `Template` (report shape) are orthogonal and compose well: *template → dataset → exporter*. A combined design would let V2's PDF render V3's templates.

## 9. Recommendation

**Adopt V2 as the base, conditional on three fixes before merge:**
1. **Fix V2-1:** initialise the reducer from saved preferences.
2. **Fix the jsPDF advisories.** Either upgrade to `jspdf@4.x` + `jspdf-autotable@5.x`, re-test, and add Unicode font embedding (V2-2), or drop PDF in favour of a print stylesheet (`window.print()`, zero dependencies, correct Unicode, and the browser's "Save as PDF").
3. **Replace raw error messages** with friendly ones.

**Then port from V3:**
1. **Share links**, after adding schema validation to `decodeSnapshot` (known categories, types, size caps), routing the viewer's CSV download through the guarded writer (V3-6), and removing the implied guarantee from the expiry wording. If expiry or revocation must be real, it needs a server.
2. **Backup-freshness awareness** (the sync pill), deriving `lastBackupAt` from a dedicated stored field rather than job history (V3-5).

**Do not adopt from V3, at least for now:**
- **Simulated integrations:** they need a backend to become real.
- **The client-side scheduler:** it has multi-tab issues and needs leader election (for example through the Web Locks API or `BroadcastChannel`), or it should move to a server.

**Separately, whatever the choice:** plan the Next.js 14 → 16 upgrade (BASE-1).

**V1:** not recommended as a standalone choice. Its only change is a second button; `main` already exports CSV from the Expenses page.
