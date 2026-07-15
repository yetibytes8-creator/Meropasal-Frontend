/**
 * Escapes a string for safe insertion into HTML markup.
 * Prevents XSS when user-supplied values (customer names, product names, etc.)
 * are embedded in dynamic HTML views (e.g. invoice print windows).
 */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
