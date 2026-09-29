import { COLUMN_LABELS, type Exporter } from "../types";
import { displayCell } from "../cells";
import { formatCurrency, formatDate } from "../../format";
import { CATEGORY_STYLES } from "../../types";

type RGB = [number, number, number];

const INK: RGB = [11, 11, 11];
const MUTED: RGB = [82, 81, 78];
const BRAND: RGB = [42, 120, 214];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const pdfExporter: Exporter = {
  id: "pdf",
  label: "PDF",
  description: "Formatted report with summary. Best for sharing and printing.",
  extension: "pdf",
  mimeType: "application/pdf",
  supportsColumns: true,
  async build({ rows, options, summary, generatedAt }) {
    // Loaded on demand so the ~350 KB library never ships with the main bundle.
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;

    // Header
    doc.setFillColor(...BRAND).rect(0, 0, pageW, 6, "F");
    doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(...INK).text("Expense Report", margin, 56);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...MUTED);
    const range =
      summary.firstDate && summary.lastDate ? `${formatDate(options.from || summary.firstDate)} – ${formatDate(options.to || summary.lastDate)}` : "No data";
    doc.text(`${range}   ·   Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, margin, 74);

    // Summary tiles
    const tiles = [
      ["Total spent", formatCurrency(summary.totalCents)],
      ["Transactions", String(summary.count)],
      ["Average", formatCurrency(summary.count ? Math.round(summary.totalCents / summary.count) : 0)],
    ];
    const tileW = (pageW - margin * 2 - 16) / 3;
    tiles.forEach(([label, value], i) => {
      const x = margin + i * (tileW + 8);
      doc.setDrawColor(226, 232, 240).setFillColor(248, 250, 252).roundedRect(x, 92, tileW, 52, 6, 6, "FD");
      doc.setFontSize(9).setTextColor(...MUTED).text(label.toUpperCase(), x + 12, 110);
      doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...INK).text(value, x + 12, 132);
      doc.setFont("helvetica", "normal");
    });

    // Category breakdown
    autoTable(doc, {
      startY: 164,
      margin: { left: margin, right: margin },
      head: [["Category", "Transactions", "Total", "Share"]],
      body: summary.byCategory.map((c) => [
        c.category,
        String(c.count),
        formatCurrency(c.cents),
        `${summary.totalCents ? ((c.cents / summary.totalCents) * 100).toFixed(1) : "0.0"}%`,
      ]),
      theme: "plain",
      styles: { fontSize: 9, textColor: INK, cellPadding: { top: 5, bottom: 5, left: 14, right: 6 } },
      headStyles: { fontStyle: "bold", textColor: MUTED, fillColor: [241, 245, 249] },
      // columnStyles only reach body cells; align header/footer numerics too.
      didParseCell: (d) => {
        if (d.column.index > 0) d.cell.styles.halign = "right";
      },
      didDrawCell: (d) => {
        if (d.section === "body" && d.column.index === 0) {
          const cat = summary.byCategory[d.row.index].category;
          doc.setFillColor(...hexToRgb(CATEGORY_STYLES[cat].color));
          doc.circle(d.cell.x + 6, d.cell.y + d.cell.height / 2, 2.5, "F");
        }
      },
    });

    // Detail table
    const cols = options.columns;
    const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK).text("Transactions", margin, afterSummary + 28);
    autoTable(doc, {
      startY: afterSummary + 38,
      margin: { left: margin, right: margin, bottom: 48 },
      head: [cols.map((c) => COLUMN_LABELS[c])],
      body: rows.map((e) => cols.map((c) => displayCell(e, c))),
      foot: cols.includes("amount")
        ? [cols.map((c, i) => (c === "amount" ? formatCurrency(summary.totalCents) : i === 0 ? "Total" : ""))]
        : undefined,
      theme: "striped",
      showFoot: "lastPage",
      styles: { fontSize: 9, textColor: INK, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (d) => {
        if (cols[d.column.index] === "amount") d.cell.styles.halign = "right";
      },
    });

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8).setTextColor(...MUTED);
      doc.text("Ledgerly", margin, h - 24);
      doc.text(`Page ${i} of ${pages}`, pageW - margin, h - 24, { align: "right" });
    }

    return doc.output("blob");
  },
};
