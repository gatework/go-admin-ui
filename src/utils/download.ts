/**
 * Hands the browser a file to save.
 *
 * The object URL is revoked a moment later rather than at once: Safari starts
 * the download asynchronously and cancels it if the URL is already gone.
 */
export function downloadBlob(content: string | ArrayBuffer | Blob, filename: string, type = 'application/octet-stream'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** `device-inventory` -> `device-inventory-2026-11-16.csv`. */
export const datedFilename = (stem: string, extension: string, date = new Date()): string =>
  `${stem}-${date.toISOString().slice(0, 10)}.${extension}`
