# Data Export — Best-Practices Assessment of Three Implementations

**Companion to:** `code-analysis.md` (defect IDs such as V2-1 and V3-3 refer to that document)
**Branches:** `feature-data-export-v1` (`77fd006`) · `feature-data-export-v2` (`fc7decb`) · `feature-data-export-v3` (`aa47d4f`) · baseline `main` (`e224d1b`)
**Date:** 2026-09-29

---

## 1. Summary

| Practice | V1 · Simple | V2 · Advanced local | V3 · Cloud hub |
|---|---|---|---|
| **S** — Single Responsibility | 🟡 | 🟢 engine · 🟡 drawer | 🔴 provider & composer · 🟢 lib |
| **O** — Open/Closed | 🔴 | 🟢 | 🟢 templates · 🔴 destinations |
| **L** — Liskov Substitution | n/a | 🟡 | 🟢 |
| **I** — Interface Segregation | n/a | 🟡 | 🔴 |
| **D** — Dependency Inversion | 🟡 | 🟡 | 🔴 |
| DRY | 🟢 | 🟡 | 🔴 |
| KISS / YAGNI | 🟢 | 🟢 | 🔴 |
| Separation of concerns / layering | 🟡 | 🟢 | 🟡 |
| Type safety | 🟢 | 🟢 | 🟡 |
| React hooks & state practices | 🟢 | 🟡 | 🟡 |
| Error handling | 🔴 | 🟢 | 🟡 |
| Accessibility | 🟢 | 🟡 | 🟡 |
| Security practices | 🟢 | 🔴 (dependency advisories) | 🔴 (unvalidated input) |
| Automated tests in repo | 🔴 | 🔴 | 🔴 |
| Dependency hygiene | 🟢 | 🔴 | 🟢 |
| Commit hygiene | 🟢 | 🟡 | 🟡 |

🟢 follows the practice · 🟡 partly, with specific issues · 🔴 clear violation · n/a no meaningful surface to judge

**In one line each:**
- **V1** follows best practice by keeping everything small, but it has no structure to extend and no error handling.
- **V2 has the most principled design.** Its export engine is a textbook Open/Closed strategy registry. Its weaknesses are in the UI layer (a drawer doing too much, a suppressed hooks lint rule) and in dependency hygiene.
- **V3's domain layer is well designed**; templates in particular are a clean registry. However, its central provider and composer violate SRP and ISP. Knowledge about destinations is scattered across six files, violating OCP. It also repeats itself the most, including a CSV writer that skips the security guard.

**Shared gap:** none of the branches commits any automated tests. The Playwright suites used to verify them (28 checks for V2, 42 for V3) live outside the repository.

---

## 2. How this was assessed

- **Sources:**
  - each branch's diff against `main`;
  - targeted `git grep` across branches for duplicated logic, type casts, direct storage access, lint suppressions, ARIA roles, error-catching blocks, and every place that branches on a destination id;
  - the confirmed defects in `code-analysis.md`.
- **What is judged:** only the code each branch adds or changes. Where a branch inherits a problem from `main`, that is noted but not counted against it.
- **Citations:** `path:line` refers to that branch's tree.
- **Evidence levels:**
  - ✅ **Verified** means the defect was reproduced by running the code (browser tests or `npm audit`, see `code-analysis.md` §2).
  - 🔎 **By inspection** means found by reading the code, not executed.

---

## 3. SOLID

SOLID was written for object-oriented classes. In a React and TypeScript codebase, each principle maps as follows:

| Principle | Unit it applies to here |
|---|---|
| **S**ingle Responsibility | modules, hooks and components |
| **O**pen/Closed | registries, switch statements, lookup maps |
| **L**iskov Substitution | implementations of a shared interface |
| **I**nterface Segregation | context values and prop types |
| **D**ependency Inversion | what hooks and engines import versus what gets passed in |

### 3.1 S — Single Responsibility Principle
*"A module should have one reason to change."*

**V1: 🟡**
- **Mixed roles:** the dashboard page now also orchestrates an export. The whole handler is one inline expression, `onClick={() => downloadCSV(sortByDateDesc(expenses))}` (`src/app/page.tsx:29`), so the page gains a second responsibility, but only a trivial one.
- **Well-scoped:** `csv.ts` stays single-purpose.

**V2: 🟢 engine, 🟡 UI**
- **The engine is cleanly split.** Each module has one reason to change:
  - `select.ts` (what rows to include);
  - `cells.ts` (how a value is rendered);
  - `filename.ts` (naming rules);
  - `download.ts` (saving a file);
  - `formats/*.ts` (one per format);
  - `index.ts` (orchestration).
- **`useExportOptions` owns option state only,** apart from preference saving, which is mixed in; see D.
- **`ExportDrawer.tsx` (170 lines) has at least five reasons to change:**
  - deriving rows and summary;
  - validation rules (the `errors` object);
  - running the export;
  - keyboard shortcuts and scroll locking;
  - layout.

  *Refactor:* move validation to a pure `validateExport(state, rows)` in `lib/export`, and move keyboard handling and scroll locking into a reusable `useDialogBehavior` hook. The shared `Modal` needs the same.

**V3: 🔴 provider and composer, 🟢 lib**
- **`useCloud.tsx` (266 lines) is a "god provider"** with seven responsibilities:
  - persistence (`loadState`, the storage effect, lines 47 and 100);
  - destination-specific result messages (`describeResult`, line 66);
  - the job runner (`runExport`, 113);
  - connection management (162–172);
  - schedule management (174–203);
  - the scheduler loop (205);
  - share-link records (224–225) and derived backup status (228–236).

  This is also why the multi-tab defects (V3-1, V3-2) are hard to fix: persistence, scheduling and job execution can't be changed independently.
- **`Composer.tsx` (277 lines) mixes too many roles:**
  - template, destination and settings state;
  - a hand-built recipient chip input with its own keyboard handling;
  - validation rules for four destinations;
  - submission;
  - all the markup.
- **`lib/cloud` is well separated:** `period`, `templates`, `serialize`, `schedule` and `share` each own one concern.

*Refactor for V3:* split into `useCloudStore` (persistence plus cross-tab sync), `useJobRunner`, `useScheduler` (with leader election) and `useShares`. Extract `<RecipientInput>` and `validateSpec(spec)`.

### 3.2 O — Open/Closed Principle
*"Open for extension, closed for modification."*

**V1: 🔴**
- **Hard-coded format:** CSV and its columns are fixed, so any new format or filter means editing `csv.ts` and the call site.
- **Mitigation:** for a two-file change that's acceptable, but it gives nothing to extend.

**V2: 🟢**
- **This is the strongest OCP example across the branches.** `EXPORTERS: Record<ExportFormatId, Exporter>` (`lib/export/index.ts`) is a strategy registry.
- **Adding a format** (XLSX, say) means adding `formats/xlsx.ts` plus one entry in the registry and one in the union type.
- **Nothing else changes:** the UI renders format cards from `Object.values(EXPORTERS)`, and the file extension, MIME type and description all come from the strategy.
- **Minor leak:** `FORMAT_ICONS` in `ExportOptionsPanel.tsx` is a separate map keyed by format id, so a new format also needs an icon added there. Moving `icon` onto `Exporter` would close this.

**V3: 🟢 templates, 🔴 destinations**
- **Templates follow OCP.** Each one carries its name, periods, default format and its own `build()`, and every consumer iterates `TEMPLATE_LIST`.
- **Destinations don't.** Knowledge about each destination is spread over six places:

| Location | What it holds |
|---|---|
| `lib/cloud/destinations.ts:20` | catalogue (name, colour, stages, …) |
| `lib/cloud/destinations.ts:108` | `simulatedAccount` switch |
| `components/cloud/Composer.tsx:18` | `ACTION_LABEL` map |
| `components/cloud/ConnectDialog.tsx:11` | `SCOPES` map |
| `components/cloud/DestinationPreview.tsx:16` | `switch (spec.destination)` for previews |
| `hooks/useCloud.tsx:68` | `describeResult` switch |

  Adding a destination means changing six locations: the "shotgun surgery" smell. `Composer` also hard-codes per-destination settings fields and validation.

*Refactor:* make `Destination` a full strategy, with `actionLabel`, `scopes`, `SettingsFields`, `Preview`, `validate(settings)` and `describeResult(settings, fileName)`, as templates already are.

### 3.3 L — Liskov Substitution Principle
*"Implementations must be usable wherever their interface is expected, without surprises."*

**V1: n/a**, since there's no interface.

**V2: 🟡**
- **One implementation ignores part of its contract.** All three exporters satisfy `build(payload): Promise<Blob>`, but `jsonExporter` ignores `payload.options.columns`.
- **The deviation is declared** through a capability flag (`supportsColumns: false`), and callers check it (`ExportOptionsPanel`, `ExportPreview`).
- **The cost:** the interface isn't fully substitutable. Every consumer has to know about the flag, and a new consumer that forgets it will show column choices that don't take effect.
- **Stricter alternatives:** give JSON a different payload type (a discriminated union on `supportsColumns`), or have it honour the column selection.

**V3: 🟢**
- **Templates:** every `Template.build()` returns a `Dataset` that every serializer and preview handles uniformly.
- **Destinations:** every destination runs through the same stage pipeline, so a job runs identically whether it's real or simulated.

### 3.4 I — Interface Segregation Principle
*"Clients shouldn't depend on members they don't use."*

**V1: n/a**

**V2: 🟡**
- **Small context:** `ExportCenterValue` exposes only `openExport` ✅.
- **Mixed concerns in `Exporter`:** it combines engine members (`build`, `extension`, `mimeType`) with presentation members (`label`, `description`, `supportsColumns`). Engine code can't use one without the other; splitting into `ExportEngine` and `ExportFormatMeta` would fix that.
- **Oversized props:** `ExportDrawer` takes a whole options bundle, including an unused `reset` prop (`ExportDrawer.tsx:21`).

**V3: 🔴**
- **`CloudContextValue` has 17 members** (state, 11 actions and 3 derived values), and every consumer receives all of them:
  - `SyncIndicator` uses 6;
  - `ActivityTray` uses 1;
  - `Integrations` uses 4.
- **The cost is real, not just stylistic.** A new context value is created on every job progress update (each pipeline stage, about every 0.5–1 s per running job), so the navbar's `SyncIndicator`, every open panel, and the tray all re-render at each step while an export runs.
- *Refactor:* split into separate contexts (`JobsContext`, `SchedulesContext`, `ConnectionsContext`, `SharesContext`) or use a store with selectors (for example Zustand, or `useSyncExternalStore`).

### 3.5 D — Dependency Inversion Principle
*"Depend on abstractions, not on concrete details."*

**V1: 🟡**
- **Concrete dependency:** the dashboard depends directly on the browser download helper. That's acceptable at this size.

**V2: 🟡**
- ✅ **Abstraction:** the engine depends on the `Exporter` abstraction, and the registry is the composition root.
- **Concrete dependencies:**
  - `runExport` calls the concrete, DOM-based `saveBlob` directly, so "export" and "save to device" are welded together. Tests can't swap the destination, and another destination (such as a share target) can't reuse `runExport`. Injecting a `sink: (blob, name) => void | Promise<void>` would fix it.
  - `useExportOptions` reads and writes `window.localStorage` directly (lines 71 and 135), bypassing the app's own `lib/storage.ts`. That's why V2-1 (settings lost on reload) went unnoticed: there's no storage seam to test against.

**V3: 🔴**
- **Hard-wired store:** `useCloud` hard-wires `window.localStorage` (lines 49 and 103), the module-level `TEMPLATES` and `DESTINATIONS`, `crypto.subtle`, timers, and DOM downloads.
- **No seams for:**
  - **a backend:** this is the architectural blocker to replacing simulated integrations with real ones;
  - **tests:** a fake clock or fake store for the scheduler;
  - **cross-tab coordination.**
- *Refactor:* inject `CloudStore` (load/save/subscribe), `JobExecutor` (a local implementation today, an HTTP one later) and `Clock` interfaces into the provider.

---

## 4. Other engineering practices

### 4.1 DRY — Don't Repeat Yourself

| Duplication | V1 | V2 | V3 |
|---|---|---|---|
| CSV writers | 1 (reused ✅) | 1 | **2:** `lib/cloud/serialize.ts:3` and an inline copy in `app/share/page.tsx:64` that **omits the formula-injection guard** (see §4.8) |
| Date-range / preset logic | reuses `main` | **2:** `FiltersBar.tsx:12` (on `main`) and `useExportOptions.ts:17,25` | **2:** `FiltersBar.tsx:12` and `lib/cloud/period.ts:4,14` |
| Email regex | — | — | **2:** `Composer.tsx:16` and `Schedules.tsx:19` |
| Pill / chip button component | — | local `Chip` in `ExportOptionsPanel` | `Pill` exported from `Composer` and imported by 3 other modules (reuse ✅, but it lives in the wrong module) |
| Focus / Escape / scroll-lock behaviour | — | re-implemented in `ExportDrawer` (also in `Modal` on `main`) | reuses `Modal` ✅ |

- **V1 is the DRY example:** it reuses the existing helper instead of writing a second one.
- **V3's duplicated CSV writer is the costliest,** because the two copies have already drifted apart on a security rule.

### 4.2 KISS / YAGNI — keep it simple; don't build what isn't needed yet
- **V1 🟢:** the smallest change that meets its brief.
- **V2 🟢:** complexity matches the brief; each option maps to a stated requirement. Remembered preferences and the keyboard shortcut go slightly beyond the brief, but they're cheap.
- **V3 🔴:** the brief asked for simulated integrations, but the implementation goes well past that:
  - a "Coming soon" row;
  - suggestion cards;
  - SHA-256 checksums;
  - simulated stage labels such as "Encrypting";
  - a client-side scheduler that can't be correct across tabs without further infrastructure.

  Each item is individually defensible, but together they roughly double the code to maintain for features that aren't real yet.

### 4.3 Separation of concerns and layering

| Layer | V1 | V2 | V3 |
|---|---|---|---|
| Pure domain logic, no React | `csv.ts` ✅ | `lib/export/*` ✅ | `lib/cloud/*` ✅ |
| State | none | `useExportOptions` ✅ | `useCloud` (overloaded, §3.1) |
| Presentation | page | `components/export/*` ✅ | `components/cloud/*` ✅ |
| Rules kept in the UI | — | validation in `ExportDrawer` | validation in `Composer` and `ScheduleForm`; result copy in `useCloud` |

- **V2 and V3 both get the key separation right:** export logic lives in `lib/`, independent of React, and can be tested with plain Node.
- **V3 also separates routes well:** the public `/share` route has its own layout and pulls in no private app state, which is good boundary design.

### 4.4 Type safety
- **V1 🟢:** no new types needed.
- **V2 🟢:**
  - Discriminated unions are used throughout: `ExportAction`, the drawer's `Status`, `ExportFormatId`, `ExportColumn`.
  - The reducer is exhaustive, and column order is derived from a `const` tuple.
  - **One unchecked cast:** `(doc as unknown as { lastAutoTable: … })` in `pdf.ts:83` works around missing third-party typings. It's acceptable, but it has no comment and no runtime check.
- **V3 🟡:**
  - The domain types are rich and well modelled (`ExportSpec`, `ExportJob`, `Schedule`, `ShareSnapshot` with tuple rows).
  - **The one unchecked cast is on untrusted input:** `return data as ShareSnapshot` (`lib/cloud/share.ts:66`) after checking only 3 fields. That is the direct cause of V3-3 (malformed link crashes the viewer) and part of §4.8.
  - **Fix:** validate the link data with a schema (zod or valibot, or a hand-written guard) rather than a cast.

### 4.5 React hooks and state practices
**V2 🟡**
- **Lint suppression:** `// eslint-disable-next-line react-hooks/exhaustive-deps` (`ExportCenter.tsx:25`) hides the fact that `reset` from `useExportOptions` isn't memoised.
- **Missing dependency array:** an effect in `ExportDrawer.tsx` (the keydown listener, line 64) re-subscribes on every render. It's harmless but sloppy.
- **Initialisation bug:** the reducer is initialised from `DEFAULT_PREFS` while the saved preferences are loaded later, which is the root cause of V2-1. Load them inside `useReducer`'s lazy initialiser.
- ✅ **Good practice:** a `useMemo` chain for derived data, and `useDeferredValue` on the Expenses page (inherited from `main`).

**V3 🟡**
- **Refs as a workaround:** `expensesRef` and `stateRef` let async jobs see current state. That's a legitimate pattern, but here it's a symptom of long-running work living inside a React provider rather than a service.
- **Remounting via `key`:** `<Composer key={template} …>` resets the whole composer to apply a template chosen from a suggestion card. It works, but it hides the data flow.
- ✅ **Good practice:**
  - a `useEffect` hand-off (fixed during development from a set-state-during-render bug);
  - `Suspense` wrapping `useSearchParams`, as the Next.js App Router requires;
  - interrupted jobs are reconciled when the app loads.

### 4.6 Error handling
- **V1 🔴:** the new handler has no `try/catch` or user feedback, which is inconsistent with the Expenses page on `main`, where the same call is wrapped and shows a toast.
- **V2 🟢:**
  - Validation is inline, and a tagged-union `Status` covers error states.
  - The UI is locked while an export runs.
  - *Gap:* raw `err.message` is shown to users (`ExportDrawer.tsx:79`).
- **V3 🟡:**
  - Errors are structured per job, with guidance ("Reconnect it under Integrations"), and interrupted jobs are handled.
  - *Gaps:*
    - the persistence write failure is caught silently (`useCloud.tsx:104`), so history can stop saving without any sign;
    - there is no validation for share-link data (V3-3).

### 4.7 Accessibility
**Both V2 and V3 🟡:**
- ✅ **Done well:**
  - ARIA roles are used for radio, pressed-button, switch and alert states;
  - buttons and inputs have labels;
  - status updates are announced (`aria-live`);
  - animations are subtle;
  - layouts are responsive down to 390 px (verified).
- **Missing:**
  - **Focus trapping** in V2's drawer and in the shared `Modal` (on `main`, also used by V3): Tab can move focus to the page behind.
  - **Incomplete tabs:** `role="tablist"` is used in V2's `ExportPreview.tsx:24` and V3's `exports/page.tsx:88`, but without `role="tabpanel"`, `aria-controls` or arrow-key navigation, so the tab pattern is only half implemented.
  - **Emoji as icons** (V3 templates and suggestions): they're decorative, but not every one is marked `aria-hidden`.

**V1 🟢:** a standard button with a visible label.

### 4.8 Security practices
- **V1 🟢:** no new attack surface; reuses the formula-injection guard.
- **V2 🔴:**
  - Pinned to `jspdf@2.5.2` and `jspdf-autotable@3.8.4`, which have critical and high advisories (V2-3).
  - Our code doesn't call the vulnerable APIs, but choosing an outdated major version for a new dependency is a hygiene failure.
- **V3 🔴:**
  - ✅ **V3-6: formula injection in the share viewer's CSV download** (`app/share/page.tsx:64`), reproduced in the browser. The viewer's "Download CSV" only applies quoting, not the guard in `serialize.ts`.
    - Share links are *untrusted input* written by someone else.
    - So a crafted link whose descriptions start with `=`, `+`, `-` or `@` (for example `=HYPERLINK("https://evil…","Click")`) would put live formulas into the recipient's spreadsheet.
    - Fix: reuse `serialize.ts`'s `csvCell`, which is also the DRY fix in §4.1.
  - **Unchecked type cast of link data** (§4.4) and a potential memory blow-up from a crafted compressed link (V3-3).
  - **UI copy overstates guarantees:** "Link expires" (V3-4) and "Encrypting" stage labels.
  - ✅ **Good choices:**
    - data is carried in the URL fragment (never sent to a server);
    - no credentials are handled;
    - clear labelling of simulated features;
    - React escaping throughout (no XSS).

### 4.9 Automated tests
**All 🔴.** No branch contains a test file or test runner; the count of test files is 0 on `main`, V1, V2 and V3.

The Playwright suites used during development prove each version works, but they live in a scratch directory and would be lost. Minimum recommended bar:
- **Unit tests** (Vitest) for the pure layers, which are easy to test:
  - V2 `select` / `filename` / `formats/csv`;
  - V3 `templates` (the tax report subtotals must reconcile), `schedule.computeNextRun`, and the `share` encode/decode round trip;
  - a test that locks in the formula-guard behaviour.
- **Regression tests** for each confirmed defect (V2-1, V3-1, V3-2, V3-3).
- **The existing Playwright flows** committed as end-to-end tests.

### 4.10 Dependency hygiene
- **V1 🟢:** no new dependencies.
- **V2 🔴:**
  - ✅ Exact pinning makes builds reproducible, and the PDF library is lazy-loaded (it isn't on the first-load path).
  - ❌ The pinned versions have advisories, and no `npm audit` step exists.
- **V3 🟢:** one small, focused dependency (`qrcode`, about 8 KB gzipped), plus its types kept in `devDependencies`.
- **All branches:** they inherit `next@14.2.33` (BASE-1). The upgrade path is Next 16.

### 4.11 Commit and change hygiene
- **V1 🟢:** one focused commit; the message explains the column-order side effect.
- **V2 🟡 and V3 🟡:**
  - Descriptive commit messages.
  - However, each bundles unrelated changes into its single commit:
    - both move the toast position;
    - V3 also restructures the routes into an `(app)` group.
  - Atomic commits (for example "refactor: move routes into (app) group" separately) would make review and cherry-picking far easier. This matters here because §8 of `code-analysis.md` recommends porting pieces of V3 into V2.

---

## 5. Recommended refactors, by adoption path

If **V2 is adopted as the base** (the current recommendation), in priority order:

1. **Security and correctness:**
   - upgrade jsPDF to 4.x, or replace it with print CSS;
   - initialise preferences inside the reducer's lazy initialiser (V2-1).
2. **DIP:**
   - route preference storage through `lib/storage.ts` behind a small `KeyValueStore` interface;
   - give `runExport` a `sink` parameter.
3. **SRP:** extract `validateExport()` into `lib/export`, and a `useDialogBehavior()` hook (focus trap, Escape, scroll lock) shared with `Modal`.
4. **LSP/ISP:** split `Exporter` into engine and metadata interfaces, and move `icon` onto the metadata.
5. **Hooks:** memoise `reset` and remove the `eslint-disable`.
6. **Tests:** add Vitest for `lib/export/*` and commit the Playwright flows.

When **porting pieces of V3** (share links, backup status):

1. **Validate `ShareSnapshot` with a schema** and cap its decompressed size.
2. **Use a single CSV writer,** with the formula guard, for the share viewer.
3. **Store `lastBackupAt` in its own field,** not derived from job history (V3-5).
4. **Keep any future provider split by concern** rather than recreating `useCloud`'s 17-member context.

If **V3's full hub is ever pursued**, first:

1. **Make `Destination` a complete strategy** (§3.2).
2. **Inject a store, a job executor and a clock** (§3.5) so a real backend can replace the simulations.
3. **Add cross-tab coordination** (Web Locks or `BroadcastChannel`) before trusting the scheduler.
