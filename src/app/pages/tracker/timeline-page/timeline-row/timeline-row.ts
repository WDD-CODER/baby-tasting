import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { HE } from '../../../../core/i18n/he'
import { TrackerEvent } from '../../../../core/models/tracker-event'
import { TrackerSettingsService } from '../../../../core/services/tracker-settings.service'
import { describeRow } from './timeline-row-view'

/** One event on the timeline: icon, Hebrew title, detail line, badges and the quality-tier accent. */
@Component({
  selector: 'app-timeline-row',
  templateUrl: './timeline-row.html',
  styleUrl: './timeline-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineRow {
  private readonly settings = inject(TrackerSettingsService)

  readonly event = input.required<TrackerEvent>()
  /** Every loaded event, newest first. */
  readonly events = input<readonly TrackerEvent[]>([])
  readonly edit = output<TrackerEvent>()

  protected readonly t = HE.tracker.timeline
  protected readonly view = computed(() => {
    const s = this.settings.settings()
    return describeRow(this.event(), {
      events: this.events(),
      parentName: (p) => (p === 'PARENT_B' ? (s?.parentBName ?? '') : (s?.parentAName ?? '')),
    })
  })
}
