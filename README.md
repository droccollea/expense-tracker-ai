# Ledgerly — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in your browser's `localStorage`.

## Features

- **Add / edit / delete** expenses (date, amount, category, description) with inline validation; deletes can be undone from the toast
- **Dashboard**: total, this month (vs. last month), monthly average, top category, a monthly spending chart (6/12 months, hover for values), a category breakdown and recent expenses
- **Expense list**: text search, category filter, date range (plus quick presets), sorting, and "show more" paging
- **Export & Sync hub** (`/exports`):
  - **Send**: pick a report template (Monthly Summary, Tax Report, Category Analysis, Full Backup), a destination (this device, email, Google Sheets, Dropbox, OneDrive, Notion, Slack) and see a live preview of how it will arrive. Exports run as background jobs with progress in an activity tray.
  - **Share**: create a read-only report link and QR code. The report is compressed into the URL fragment, so no server stores it; links can expire.
  - **Schedules**: recurring exports (daily/weekly/monthly) that run while the app is open, and catch up on missed runs.
  - **History**: every export with status, size and a SHA-256 checksum; re-run any of them.
  - **Integrations**: connect or disconnect services.
  - A navbar sync indicator shows backup freshness and unsynced changes.
  - **Demo note:** email and third-party services are simulated (clearly labelled in the UI). Downloads, schedules, history and share links are real.
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
  app/(app)/           # app routes with navigation: / (dashboard), /expenses, /exports
  app/share/           # public read-only report viewer (no app chrome)
  components/          # UI: form, dialogs, charts, filters, list, navbar…
  hooks/               # useExpenses (state + localStorage), useToast
  components/cloud/    # export hub UI: composer, previews, share, schedules, history, integrations
  lib/                 # types, formatting, analytics, storage
  lib/cloud/           # templates, destinations, serialization, scheduling, share-link encoding
```

Amounts are stored as integer cents so totals don't pick up floating-point errors. Dates are stored as local `YYYY-MM-DD` strings.
