import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { israelClock } from '../../../core/utils/israel-time'
import { Icon } from '../../../shared/ui/icon/icon'

/** The Bio Gaya event given in the baby day, or null. */
export function bioGayaGiven(events: TrackerEvent[]): TrackerEvent | null {
  return events.find((e) => e.eventType === 'SUPPLEMENT') ?? null
}

/** Shown when Bio Gaya was given in the baby day: the time and who gave it. Display only. */
@Component({
  selector: 'app-bio-gaya-card',
  imports: [Icon],
  templateUrl: './bio-gaya-card.html',
  styleUrl: './bio-gaya-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BioGayaCard {
  private readonly settings = inject(TrackerSettingsService)

  /** The baby day's events, newest first. */
  readonly events = input.required<TrackerEvent[]>()

  protected readonly t = HE.tracker.log

  protected readonly given = computed(() => bioGayaGiven(this.events()))
  protected readonly time = computed(() => {
    const e = this.given()
    return e ? this.t.bioGayaGiven.replace('{t}', israelClock(Date.parse(e.timestamp))) : ''
  })
  protected readonly parent = computed(() => {
    const e = this.given()
    const s = this.settings.settings()
    return e?.loggedBy === 'PARENT_B' ? (s?.parentBName ?? '') : (s?.parentAName ?? '')
  })
}
