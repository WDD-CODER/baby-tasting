import { Injectable } from '@angular/core'

const WINDOW_MS = 10000

/** Blocks the same kind of save twice within 10 s. A key is registered only when asked, so ask after validation. */
@Injectable({ providedIn: 'root' })
export class DoubleSubmitService {
  private readonly last_ = new Map<string, number>()

  /** True when `key` was registered less than 10 s ago (the action must stop); otherwise registers `now`. */
  isDuplicate(key: string, now: number = Date.now()): boolean {
    const last = this.last_.get(key)
    if (last !== undefined && now - last < WINDOW_MS) return true
    this.last_.set(key, now)
    return false
  }
}
