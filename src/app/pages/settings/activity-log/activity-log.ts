import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { ActivityEntry } from '../../../core/models/settings'
import { ActivityService } from '../../../core/services/activity.service'
import { Button } from '../../../shared/ui/button/button'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

const PAGE = 20

/** `לפני 2 דקות`-style text for a past instant. */
export function relativeTime(at: string, now: Date = new Date()): string {
  const t = HE.activity
  const minutes = Math.floor((now.getTime() - new Date(at).getTime()) / 60000)
  if (minutes < 1) return t.justNow
  if (minutes === 1) return t.oneMinute
  if (minutes < 60) return t.minutes.replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return t.oneHour
  if (hours < 24) return t.hours.replace('{n}', String(hours))
  const days = Math.floor(hours / 24)
  if (days === 1) return t.oneDay
  return t.days.replace('{n}', String(days))
}

/** The summary text of an entry: the template of its kind with the entry's names filled in. */
export function summaryText(entry: ActivityEntry): string {
  const template = (HE.activity.kinds as Record<string, string>)[entry.summary.kind] ?? ''
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => entry.summary[key] ?? '')
}

@Component({
  selector: 'app-activity-log',
  imports: [Button, ErrorState, LoadingState],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLog {
  private readonly activity = inject(ActivityService)

  protected readonly t = HE.activity
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly entries_ = signal<ActivityEntry[]>([])
  protected readonly shown_ = signal(PAGE)
  protected readonly rows_ = computed(() =>
    this.entries_()
      .slice(0, this.shown_())
      .map((entry) => ({
        user: entry.user ?? '',
        time: relativeTime(entry.at),
        text: summaryText(entry),
      })),
  )
  protected readonly hasMore_ = computed(() => this.entries_().length > this.shown_())

  constructor() {
    void this.load()
  }

  protected async load(): Promise<void> {
    this.loading_.set(true)
    this.failed_.set(false)
    try {
      this.entries_.set(await this.activity.latest())
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected more(): void {
    this.shown_.update((n) => n + PAGE)
  }
}
