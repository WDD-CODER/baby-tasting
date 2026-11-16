import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { EditSheetService } from '../../../core/services/edit-sheet.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { israelClock } from '../../../core/utils/israel-time'
import { EditSheet } from '../edit-sheet/edit-sheet'
import { TimelineRow } from './timeline-row/timeline-row'

const DAY_MS = 86400000

/** `/timeline`: everything that happened, newest first; a tap opens the edit sheet (spec-timeline-dashboards §2). */
@Component({
  selector: 'app-timeline-page',
  imports: [TimelineRow, EditSheet],
  templateUrl: './timeline-page.html',
  styleUrl: './timeline-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePage {
  private readonly service = inject(TrackerEventsService)
  private readonly settings = inject(TrackerSettingsService)
  private readonly editSheet = inject(EditSheetService)

  protected readonly t = HE.tracker.timeline
  protected readonly windows = [1, 7, 14]
  /** A rolling day window; never stored, so it is back at "today" whenever the app opens. */
  protected readonly days = signal(1)
  protected readonly loaded = this.service.loaded
  protected readonly all = this.service.events
  protected readonly open = this.service.openSleep

  protected readonly visible = computed(() => {
    const cutoff = this.service.now() - this.days() * DAY_MS
    const openId = this.open()?.id
    return this.all().filter((e) => e.id !== openId && Date.parse(e.timestamp) >= cutoff)
  })

  protected readonly sleepingLine = computed(() => {
    const open = this.open()
    if (!open?.sleep) return ''
    const start = Date.parse(open.sleep.startAt ?? open.timestamp)
    let line = this.t.startedAt.replace('{t}', israelClock(start))
    if (open.sleep.startLocation)
      line += this.t.startLocation.replace('{loc}', this.t.locations[open.sleep.startLocation])
    return line
  })

  protected readonly sleepingBy = computed(() => {
    const open = this.open()
    if (!open) return ''
    const s = this.settings.settings()
    const parent = open.sleep?.startedBy ?? open.loggedBy
    const name = parent === 'PARENT_B' ? (s?.parentBName ?? '') : (s?.parentAName ?? '')
    return this.t.loggedBy.replace('{name}', name)
  })

  constructor() {
    this.service.start()
    inject(DestroyRef).onDestroy(() => this.service.stop())
  }

  protected label(days: number): string {
    return days === 1 ? this.t.today : this.t.days.replace('{n}', String(days))
  }

  protected refresh(): void {
    void this.service.refresh(false)
  }

  protected edit(event: TrackerEvent): void {
    this.editSheet.open(event)
  }
}
