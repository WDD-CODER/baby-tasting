// 409 event_conflict: `conflict` is { id, eventType, startAt, endAt|null } of the first blocking event (D-016-2).
export function conflictError(conflict) {
  const err = new HttpError(409, 'event_conflict', 'This event conflicts with another event')
  err.conflict = conflict
  return err
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}
