import { todayISO } from "../format";

// Characters that are invalid in filenames on Windows/macOS/Linux.
const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g;

export function defaultFilename(): string {
  return `expenses-${todayISO()}`;
}

/** Returns a safe base name (no extension) or null when nothing usable remains. */
export function sanitizeFilename(input: string, extension: string): string | null {
  let name = input.trim().replace(INVALID, "-").replace(/\s+/g, " ");
  // Drop an extension the user typed themselves, e.g. "report.csv".
  if (name.toLowerCase().endsWith(`.${extension}`)) name = name.slice(0, -(extension.length + 1));
  name = name.replace(/^[.\s-]+|[.\s]+$/g, "").slice(0, 100);
  return name || null;
}
