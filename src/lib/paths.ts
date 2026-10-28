/**
 * A redirect target from a query string, kept on this site: "/add?x" passes, while "//evil.com",
 * "/\\evil.com" and "https://evil.com" fall back to the dashboard.
 */
export function localPath(next: string | null | undefined, fallback = "/me"): string {
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}
