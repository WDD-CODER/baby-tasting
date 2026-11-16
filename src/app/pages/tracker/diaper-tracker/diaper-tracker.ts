import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { israelClock } from '../../../core/utils/israel-time'

/** The daily diaper round: counts and one chip per diaper of the baby day, oldest first. */
@Component({
  selector: 'app-diaper-tracker',
  templateUrl: './diaper-tracker.html',
  styleUrl: './diaper-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaperTracker {
  private readonly settings = inject(TrackerSettingsService)

  /** The baby day's events, newest first. */
  readonly events = input.required<TrackerEvent[]>()

  protected readonly t = HE.tracker.log

  protected readonly diapers = computed(() =>
    this.events()
      .filter((e) => e.eventType === 'DIAPER')
      .reverse(),
  )
  protected readonly pee = computed(
    () => this.diapers().filter((e) => e.diaper?.contains === 'PEE').length,
  )
  protected readonly poo = computed(
    () => this.diapers().filter((e) => e.diaper?.contains === 'POO').length,
  )
  protected readonly both = computed(
    () => this.diapers().filter((e) => e.diaper?.contains === 'BOTH').length,
  )
  protected readonly countText = computed(() =>
    this.t.diaperCount.replace('{n}', String(this.diapers().length)),
  )

  protected glyph(event: TrackerEvent): string {
    const c = event.diaper?.contains
    return c === 'POO' ? '💩' : c === 'BOTH' ? '💦💩' : '💦'
  }

  protected clock(event: TrackerEvent): string {
    return israelClock(Date.parse(event.timestamp))
  }

  protected by(event: TrackerEvent): string {
    const s = this.settings.settings()
    return this.t.loggedBy.replace(
      '{name}',
      event.loggedBy === 'PARENT_B' ? (s?.parentBName ?? '') : (s?.parentAName ?? ''),
    )
  }
}
