/** Escape the HTML metacharacters `& < >` for safe interpolation into an HTML string
 *  (shared by the export documents — spec/manufacturing pack, marker sheet). */
export const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
