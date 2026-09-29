import { csvExporter } from "./formats/csv";
import { jsonExporter } from "./formats/json";
import { pdfExporter } from "./formats/pdf";
import { saveBlob } from "./download";
import { sanitizeFilename } from "./filename";
import { summarize } from "./select";
import type { Expense } from "../types";
import type { ExportFormatId, ExportOptions, Exporter } from "./types";

export const EXPORTERS: Record<ExportFormatId, Exporter> = {
  csv: csvExporter,
  json: jsonExporter,
  pdf: pdfExporter,
};

export * from "./types";
export { selectForExport, summarize } from "./select";
export { defaultFilename, sanitizeFilename } from "./filename";

/** Build the file for `rows` in the chosen format and download it. Returns the final filename. */
export async function runExport(rows: Expense[], options: ExportOptions): Promise<string> {
  const exporter = EXPORTERS[options.format];
  const base = sanitizeFilename(options.filename, exporter.extension);
  if (!base) throw new Error("Please enter a valid filename.");
  const blob = await exporter.build({ rows, options, summary: summarize(rows), generatedAt: new Date() });
  const filename = `${base}.${exporter.extension}`;
  saveBlob(blob, filename);
  return filename;
}
