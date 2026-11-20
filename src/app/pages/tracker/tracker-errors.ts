import { HE } from '../../core/i18n/he'
import { ApiError } from '../../core/models/api-error'
import { conflictMessage } from '../../core/utils/conflict-message'

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err && 'code' in err
}

/**
 * The Hebrew text for a failed save: a lost connection, an overlap naming its blocker (`candidate` is the
 * event type being saved), a sleep the server refused, or the given fallback.
 */
export function saveErrorText(err: unknown, fallback: string, candidate = 'SLEEP'): string {
  const t = HE.tracker.log
  if (!isApiError(err)) return fallback
  if (err.status === 0) return t.connectFailed
  if (err.code === 'event_conflict' && err.conflict) return conflictMessage(err.conflict, candidate)
  if (err.code === 'sleep_already_open') return t.sleepAlreadyOpen
  if (err.requestId) return `${fallback} · ${t.errorCode}: ${err.requestId.slice(0, 8)}`
  return fallback
}
