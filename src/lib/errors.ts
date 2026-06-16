import { ApiError } from '@/api'

// errorMessage turns a thrown value into a message to show the user. An ApiError
// carries the server's own {"error": ...} text; anything else (network failure,
// unexpected throw) falls back to a generic line. Pass a fallback to phrase the
// generic case for the action that failed ("Could not save changes.").
export function errorMessage(
  err: unknown,
  fallback = 'Cannot reach the server.',
): string {
  return err instanceof ApiError ? err.message : fallback
}
