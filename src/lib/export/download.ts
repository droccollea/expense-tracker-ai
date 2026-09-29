/** Trigger a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename, rel: "noopener" });
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke later: some browsers read the URL asynchronously after click().
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
