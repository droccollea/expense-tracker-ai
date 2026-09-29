import type { Exporter } from "../types";

export const jsonExporter: Exporter = {
  id: "json",
  label: "JSON",
  description: "Structured data with metadata. Ideal for backups and developers.",
  extension: "json",
  mimeType: "application/json",
  supportsColumns: false,
  async build({ rows, options, summary, generatedAt }) {
    const doc = {
      schema: "ledgerly.expenses/v1",
      exportedAt: generatedAt.toISOString(),
      filters: {
        from: options.from || null,
        to: options.to || null,
        categories: options.categories,
        sort: options.sort,
      },
      summary: {
        count: summary.count,
        total: summary.totalCents / 100,
        currency: "USD",
        dateRange: { first: summary.firstDate, last: summary.lastDate },
        byCategory: summary.byCategory.map((c) => ({ category: c.category, count: c.count, total: c.cents / 100 })),
      },
      expenses: rows.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        amount: e.amountCents / 100,
        description: e.description,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    };
    return new Blob([JSON.stringify(doc, null, 2)], { type: this.mimeType });
  },
};
