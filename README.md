# Ledgerly — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in your browser's `localStorage`.

## Features

- **Add / edit / delete** expenses (date, amount, category, description) with inline validation; deletes can be undone from the toast
- **Dashboard**: total, this month (vs. last month), monthly average, top category, a monthly spending chart (6/12 months, hover for values), a category breakdown and recent expenses
- **Expense list**: text search, category filter, date range (plus quick presets), sorting, and "show more" paging
- **Export center** (dashboard or Expenses page, or <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>): export to **CSV, JSON or PDF** with date-range presets, category selection, column picker, sort order, custom filename, a live table/raw-file preview and a record/total summary. Opening it from the Expenses page starts from that page's filters. Format, columns and sort are remembered.
- Responsive layout, loading skeletons, empty states, storage-error banner, and syncing across browser tabs

## Getting started

Requires **Node.js 18.17+** (Node 20 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Project structure

```
src/
  app/                 # routes: / (dashboard), /expenses, error + 404 pages
  components/          # UI: form, dialogs, charts, filters, list, navbar…
  hooks/               # useExpenses (state + localStorage), useToast
  components/export/   # export drawer, options panel, preview
  lib/                 # types, formatting, analytics, storage
  lib/export/          # export engine: selection, summary, filename rules, and one exporter per format
```

Amounts are stored as integer cents so totals don't pick up floating-point errors. Dates are stored as local `YYYY-MM-DD` strings.
