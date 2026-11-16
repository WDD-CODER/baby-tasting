import { HE } from '../../core/i18n/he'
import { ApiError } from '../../core/models/api-error'

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err && 'code' in err
}

/** The Hebrew text for a failed save: a lost connection, a sleep the server refused, or the given fallback. */
export function saveErrorText(err: unknown, fallback: string): string {
  const t = HE.tracker.log
  if (!isApiError(err)) return fallback
  if (err.status === 0) return t.connectFailed
  if (err.code === 'sleep_overlap') return t.sleepOverlap
  if (err.code === 'sleep_already_open') return t.sleepAlreadyOpen
  return fallback
}
