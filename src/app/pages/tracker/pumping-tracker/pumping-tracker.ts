import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { israelClock } from '../../../core/utils/israel-time'

/** The daily pumping tracker: left, right and total ml of the baby day, and the button that adds one. */
@Component({
  selector: 'app-pumping-tracker',
  templateUrl: './pumping-tracker.html',
  styleUrl: './pumping-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PumpingTracker {
  /** The baby day's events, newest first. */
  readonly events = input.required<TrackerEvent[]>()
  readonly add = output<void>()

  protected readonly t = HE.tracker.log

  protected readonly pumps = computed(() =>
    this.events()
      .filter((e) => e.eventType === 'PUMPING')
      .reverse(),
  )
  protected readonly left = computed(() =>
    this.pumps().reduce((sum, e) => sum + (e.pumping?.leftAmountMl ?? 0), 0),
  )
  protected readonly right = computed(() =>
    this.pumps().reduce((sum, e) => sum + (e.pumping?.rightAmountMl ?? 0), 0),
  )

  protected clock(event: TrackerEvent): string {
    return israelClock(Date.parse(event.timestamp))
  }

  protected total(event: TrackerEvent): number {
    return (event.pumping?.leftAmountMl ?? 0) + (event.pumping?.rightAmountMl ?? 0)
  }
}
