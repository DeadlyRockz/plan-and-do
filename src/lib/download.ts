/**
 * Saves text as a file through a temporary object URL, so nothing leaves the browser. The URL is
 * revoked straight after the click, which is enough for the browser to start the download.
 */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
