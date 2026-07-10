/**
 * Centralized RTK Query / fetch error parser.
 *
 * RTK Query errors can take multiple shapes:
 *   - { data: { message: string } }       — API error response body
 *   - { error: string }                   — FetchBaseQuery serialization error
 *   - { message: string }                 — plain JS Error
 *   - string                              — raw string
 *
 * Usage:
 *   import { parseApiError } from '@/lib/errors';
 *   toast.error(parseApiError(err));
 */
export function parseApiError(
  err: unknown,
  fallback = "An unexpected error occurred."
): string {
  if (!err) return fallback;

  // RTK Query error with a JSON body from the server
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;

    // { data: { message: string } }
    if (e.data && typeof e.data === "object") {
      const data = e.data as Record<string, unknown>;
      if (typeof data.message === "string" && data.message) {
        return data.message;
      }
    }

    // { error: string }  — FetchBaseQuery network/serialization error
    if (typeof e.error === "string" && e.error) {
      return e.error;
    }

    // Plain Error / { message: string }
    if (typeof e.message === "string" && e.message) {
      return e.message;
    }
  }

  if (typeof err === "string" && err) {
    return err;
  }

  return fallback;
}
