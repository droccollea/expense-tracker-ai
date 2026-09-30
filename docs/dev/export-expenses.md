# Export Expenses — Developer Guide

> **Scope: Frontend only.** The export runs entirely in the browser. The app has no backend: expenses live in `localStorage`, and the CSV file is built and downloaded on the client. No API routes, server actions or network requests are involved.

| | |
|---|---|
| **Entry point** | "Export CSV" button on the Expenses page (`/expenses`) |
| **Output** | `expenses-YYYY-MM-DD.csv` (UTF-8 with BOM, CRLF line endings) |
| **What gets exported** | Every expense that matches the current filters, in the current sort order |
| **Runtime dependencies** | None. Uses the browser's `Blob`, `URL.createObjectURL` and a temporary `<a download>` link |
| **Branch** | `main` |

---

## 1. Files

| File | Layer | Role |
|---|---|---|
| `src/lib/csv.ts` | Frontend (library) | Serialises expenses to CSV (`expensesToCSV`) and starts the browser download (`downloadCSV`) |
| `src/app/expenses/page.tsx` | Frontend (UI) | Renders the button, works out which rows are `visible`, and handles empty and error cases in `handleExport` |
| `src/lib/analytics.ts` | Frontend (library) | `filterExpenses` and `sortByDateDesc`, which decide what `visible` contains |
| `src/components/FiltersBar.tsx` | Frontend (UI) | Search, category, date-range and preset controls that shape the export |
| `src/lib/format.ts` | Frontend (library) | `todayISO()` for the default file name (local date, not UTC) |
| `src/hooks/useToast.tsx` | Frontend (UI) | Success and error notifications |
| `src/components/Icons.tsx` | Frontend (UI) | `DownloadIcon` |
| `src/lib/types.ts` | Shared | `Expense` model (`amountCents`, ISO `date`, `category`, `description`) |

---

## 2. Data flow

```
localStorage ("expense-tracker:v1")
        │  loadExpenses()               src/lib/storage.ts
        ▼
useExpenses().expenses                  src/hooks/useExpenses.tsx
        │  filterExpenses(…, deferredFilters)   search / category / from / to
        │  sortByDateDesc → optional re-sort    "Sort" dropdown
        ▼
visible: Expense[]                      src/app/expenses/page.tsx  (useMemo)
        │  click "Export CSV" → handleExport()
        ▼
downloadCSV(visible)                    src/lib/csv.ts
        │  expensesToCSV → "﻿" + csv → Blob(text/csv) → objectURL
        ▼
<a download="expenses-YYYY-MM-DD.csv">.click()  →  browser saves the file
```

Things to know:

- **The export matches what the user sees.** `downloadCSV` receives the full `visible` array, so filters and sort order carry through.
- **Pagination does not limit the export.** The list shows 25 rows at a time (`PAGE_SIZE`), but the export includes all matching rows.
- **The export reads the deferred filter value.** `visible` is built from `useDeferredValue(filters)`. For a moment after typing in search, the export can reflect the previous filter value. In practice React catches up before the user can reach the button.

---

## 3. CSV format (`src/lib/csv.ts`)

### Columns

| Column | Source | Format |
|---|---|---|
| `Date` | `expense.date` | ISO `YYYY-MM-DD`, as stored |
| `Category` | `expense.category` | One of `Food`, `Transportation`, `Entertainment`, `Shopping`, `Bills`, `Other` |
| `Description` | `expense.description` | Free text, escaped (see below) |
| `Amount` | `expense.amountCents` | `(amountCents / 100).toFixed(2)`, e.g. `18.45`, with no currency symbol or thousands separator |

The export leaves out `id`, `createdAt` and `updatedAt`.

### Encoding details

- **BOM:** `downloadCSV` puts `﻿` at the start of the file so Excel detects UTF-8 and non-ASCII descriptions display correctly. `expensesToCSV` does **not** add the BOM, so its output stays clean for tests or other consumers.
- **Line endings:** rows are joined with `\r\n`, following RFC 4180.
- **Quoting:** `escapeCell` wraps a cell in double quotes when it contains `"`, `,`, `\n` or `\r`, and doubles any embedded quotes:
  `Movie night, "Dune" IMAX` → `"Movie night, ""Dune"" IMAX"`
- **Formula-injection guard:** a cell starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`, so spreadsheet apps show it as text instead of running it as a formula (OWASP "CSV Injection"). The guard runs on **every** cell, including the header, but in practice only descriptions can trigger it: dates, categories and amounts are never negative or symbol-prefixed.

> ⚠️ **Keep the guard in place.** Any new export path that writes user text to CSV must go through `escapeCell` or equivalent. `code-analysis.md` (finding V3-6) records a regression of exactly this kind on an unmerged branch.

### Example output

```csv
Date,Category,Description,Amount
2026-09-28,Food,Groceries at Green Market,18.45
2026-09-24,Entertainment,"Movie night, ""Dune"" IMAX",15.99
2026-09-10,Food,Coffee & bagel,6.50
```

---

## 4. Download mechanics

```ts
const blob = new Blob(["﻿" + expensesToCSV(expenses)], { type: "text/csv;charset=utf-8" });
const url = URL.createObjectURL(blob);
// temporary <a href={url} download={filename}> is added, clicked, removed
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

- The link is added to `document.body` before calling `click()`, because some browsers (older Firefox) ignore clicks on detached anchors.
- The object URL is revoked after 1 s instead of right away. Revoking it immediately can cancel the download in Safari.
- `downloadCSV` touches `document`, so it is **client-only**. Call it from event handlers in `"use client"` components, never during render or on the server.
- The file name defaults to `expenses-${todayISO()}.csv`. Pass a second argument to override it.

---

## 5. UI behaviour (`handleExport`)

| Condition | Result |
|---|---|
| Expenses still loading (`isLoading`) | Button is `disabled` |
| `visible.length === 0` | Error toast: *"Nothing to export — no expenses match your filters."* and nothing is downloaded |
| `downloadCSV` throws | Error toast: *"Export failed. Please try again."* |
| Success | Success toast: *"Exported N expense(s) to CSV."* |

Known quirk: when the user has **no expenses at all**, the button stays enabled and clicking it shows the "…match your filters" message, even though no filters are set.

---

## 6. Extending the feature

- **Add a column:** add it to both `header` and the row mapper in `expensesToCSV`, and keep the value going through `escapeCell`. Format numbers without locale separators so spreadsheets parse them.
- **Export from another page:** import `downloadCSV` and pass it the list you want exported. It does no filtering of its own.
- **Other formats (JSON, PDF, …):** three alternative implementations exist on the unmerged branches `feature-data-export-v1`, `-v2` and `-v3`. `code-analysis.md` compares them, and `code-best-practices.md` covers related guidance. The analysis recommends V2 as a base, subject to fixes. Read it before starting new export work.

---

## 7. Testing

The repo has no automated test suite. `expensesToCSV` is a pure function, so it is easy to unit test if one is added. Suggested cases:

- An empty array returns only the header row.
- Commas, quotes and newlines in descriptions produce correctly quoted cells.
- Descriptions starting with `=`, `+`, `-` or `@` get a leading `'`.
- `amountCents` values `0`, `5`, `100` and `123456` become `0.00`, `0.05`, `1.00` and `1234.56`.

Manual check:

1. `npm run dev`, then open `/expenses`.
2. Apply a category and date filter, change the sort, and click **Export CSV**.
3. Open the file in Excel, Numbers or Google Sheets. Row count and order should match the on-screen list, and non-ASCII text should display correctly.
4. Search for something with no matches and click **Export CSV**. You should see the error toast and no download.
