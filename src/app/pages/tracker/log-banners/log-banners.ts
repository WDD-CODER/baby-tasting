import { ChangeDetectionStrategy, Component, computed, effect, inject, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import {
  babyDayEvents,
  feedingCountdown,
  isBigNapRecorded,
  isBioGayaHours,
  isNapSlot,
  isBathSlot,
  pumpingReminderFeed,
  todayPumpingCount,
} from '../../../core/utils/tracker-rules'
import { Icon } from '../../../shared/ui/icon/icon'
import { LogReminderService } from '../log-reminder.service'
import { QuickLogService } from '../quick-log.service'
import { SleepTimer } from '../sleep-timer/sleep-timer'

const LONG_SLEEP_MS = 12 * 3600000

/** The shell banners and floating pills of the log tab (spec §3.1, §3.5) and the browser notifications (§1.7). */
@Component({
  selector: 'app-log-banners',
  imports: [Icon, SleepTimer],
  templateUrl: './log-banners.html',
  styleUrl: './log-banners.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogBanners {
  private readonly events = inject(TrackerEventsService)
  private readonly reminders = inject(LogReminderService)
  private readonly quick = inject(QuickLogService)
  private readonly toast = inject(ToastService)

  /** The parent chose "done" on the pumping reminder. */
  readonly logPumping = output<void>()
  /** The parent chose to end the long-open sleep. */
  readonly endSleep = output<void>()

  protected readonly t = HE.tracker.log

  private feedingNotified_ = false
  private pumpingNotifiedFeedId_: string | null = null

  private readonly now = this.events.now
  protected readonly openSleep = this.events.openSleep
  protected readonly day = computed(() => babyDayEvents(this.events.events(), this.now()))

  protected readonly feeding = computed(() => feedingCountdown(this.events.events(), this.now()))
  protected readonly pumpFeed = computed(() => {
    const feed = pumpingReminderFeed(this.events.events(), this.now())
    return feed && feed.id !== this.reminders.pumpingDismissedFeedId() ? feed : null
  })
  protected readonly pumpText = computed(() =>
    this.t.bannerPumping.replace(
      '{n}',
      String(todayPumpingCount(this.events.events(), this.now()) + 1),
    ),
  )
  protected readonly longSleep = computed(() => {
    const open = this.openSleep()
    if (!open || this.reminders.longSleepDismissedId() === open.id) return null
    const start = Date.parse(open.sleep?.startAt ?? open.timestamp)
    return this.now() - start > LONG_SLEEP_MS ? open : null
  })
  protected readonly nap = computed(() => isNapSlot(this.now()))
  protected readonly showBioGaya = computed(
    () => isBioGayaHours(this.now()) && !this.day().some((e) => e.eventType === 'SUPPLEMENT'),
  )
  protected readonly showBigNap = computed(
    () =>
      isNapSlot(this.now()) &&
      !this.reminders.bigNapDismissed() &&
      !isBigNapRecorded(this.events.events(), this.openSleep(), this.now()),
  )
  protected readonly showBath = computed(
    () => isBathSlot(this.now()) && !this.reminders.bathDismissed(),
  )

  constructor() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    // Feeding overdue: one notification, again only after the countdown stopped being overdue.
    effect(() => {
      if (!this.feeding().isOverdue) {
        this.feedingNotified_ = false
        return
      }
      if (this.feedingNotified_) return
      this.feedingNotified_ = true
      this.notify(this.t.notifyFeedTitle, this.t.notifyFeedBody)
    })
    // Pumping reminder: once per breast feed.
    effect(() => {
      const feed = pumpingReminderFeed(this.events.events(), this.now())
      if (
        !feed ||
        feed.id === this.reminders.pumpingDismissedFeedId() ||
        feed.id === this.pumpingNotifiedFeedId_
      )
        return
      this.pumpingNotifiedFeedId_ = feed.id
      this.notify(this.t.notifyPumpTitle, this.t.notifyPumpBody)
    })
  }

  protected dismissPumping(): void {
    const feed = this.pumpFeed()
    if (feed) this.reminders.dismissPumping(feed.id)
  }

  protected dismissLongSleep(): void {
    const open = this.longSleep()
    if (open) this.reminders.dismissLongSleep(open.id)
  }

  protected giveBioGaya(): void {
    void this.quick.bioGaya()
  }

  protected hideBigNap(): void {
    this.reminders.dismissBigNap()
    this.toast.show(this.t.bigNapHidden, 'good')
  }

  protected hideBath(): void {
    this.reminders.dismissBath()
    this.toast.show(this.t.bathHidden, 'good')
  }

  private notify(title: string, body: string): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      new Notification(title, { body, icon: '/favicon.ico' })
    } catch {
      // some browsers only allow notifications through a service worker
    }
  }
}
