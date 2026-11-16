import { Injectable, computed, inject, signal } from '@angular/core'
import { TrackerEventsService } from '../../core/services/tracker-events.service'
import { israelDateKey } from '../../core/utils/israel-time'
import { isBathSlot } from '../../core/utils/tracker-rules'

const BIG_NAP_KEY = 'bt_dismissed_bignap_'
const BATH_KEY = 'bt_dismissed_bath_'

/** What the parent dismissed: the big-nap and bath pills for the day (kept in localStorage), the rest in memory. */
@Injectable({ providedIn: 'root' })
export class LogReminderService {
  private readonly events = inject(TrackerEventsService)

  /** Bumped on a dismissal so the localStorage-backed flags are read again. */
  private readonly version_ = signal(0)
  private readonly longSleepDismissedId_ = signal<string | null>(null)
  private readonly pumpingDismissedFeedId_ = signal<string | null>(null)

  readonly longSleepDismissedId = this.longSleepDismissedId_.asReadonly()
  readonly pumpingDismissedFeedId = this.pumpingDismissedFeedId_.asReadonly()

  readonly bigNapDismissed = computed(() => this.flag(BIG_NAP_KEY))
  readonly bathDismissed = computed(() => this.flag(BATH_KEY))
  /** The bath slot is on and the reminder was not dismissed: the awake thresholds shift (spec §4.4). */
  readonly bathActive = computed(() => isBathSlot(this.events.now()) && !this.bathDismissed())

  dismissBigNap(): void {
    this.setFlag(BIG_NAP_KEY)
  }

  dismissBath(): void {
    this.setFlag(BATH_KEY)
  }

  dismissLongSleep(id: string): void {
    this.longSleepDismissedId_.set(id)
  }

  dismissPumping(feedId: string): void {
    this.pumpingDismissedFeedId_.set(feedId)
  }

  private key(prefix: string): string {
    return prefix + israelDateKey(this.events.now())
  }

  private flag(prefix: string): boolean {
    this.version_()
    try {
      return localStorage.getItem(this.key(prefix)) === 'true'
    } catch {
      return false
    }
  }

  private setFlag(prefix: string): void {
    try {
      localStorage.setItem(this.key(prefix), 'true')
    } catch {
      // storage is unavailable: the flag lasts until the page reloads
    }
    this.version_.update((v) => v + 1)
  }
}
