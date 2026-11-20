/** The first event that blocks a save (409 `event_conflict`, D-016-2); `endAt` is null for a point or an open sleep. */
export interface ConflictInfo {
  id: string
  eventType: string
  startAt: string
  endAt: string | null
}

export interface ApiError {
  status: number
  code: string
  message: string
  conflict?: ConflictInfo
  /** The server's request id (500 answers); the app shows its first 8 characters as the error code. */
  requestId?: string
}
