import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { babyDayEvents } from '../../../core/utils/tracker-rules'
import { BioGayaCard } from '../bio-gaya-card/bio-gaya-card'
import { DiaperTracker } from '../diaper-tracker/diaper-tracker'
import { EditSheet } from '../edit-sheet/edit-sheet'
import { EntrySheet } from '../entry-sheet/entry-sheet'
import { LogBanners } from '../log-banners/log-banners'
import { LogReminderService } from '../log-reminder.service'
import { PumpingTracker } from '../pumping-tracker/pumping-tracker'
import { QuickGrid } from '../quick-grid/quick-grid'
import { SheetType } from '../sheet-type'
import { TodayCarousel } from '../today-carousel/today-carousel'

/** The Tracker home (`/`): today at a glance, quick actions, the daily trackers and the entry sheets (spec §4). */
@Component({
  selector: 'app-log-page',
  imports: [
    TodayCarousel,
    QuickGrid,
    DiaperTracker,
    PumpingTracker,
    BioGayaCard,
    EntrySheet,
    EditSheet,
    LogBanners,
  ],
  templateUrl: './log-page.html',
  styleUrl: './log-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogPage {
  private readonly events = inject(TrackerEventsService)
  private readonly reminders = inject(LogReminderService)

  private readonly sheet_ = signal<SheetType | null>(null)
  protected readonly sheet = this.sheet_.asReadonly()

  protected readonly now = this.events.now
  protected readonly day = computed(() => babyDayEvents(this.events.events(), this.now()))
  protected readonly bathActive = this.reminders.bathActive

  constructor() {
    // Load, then refresh every 5 s while visible and on focus (spec §1.4); stop when the page goes away.
    this.events.start()
    inject(DestroyRef).onDestroy(() => this.events.stop())
  }

  protected open(type: SheetType): void {
    this.sheet_.set(type)
  }

  protected close(): void {
    this.sheet_.set(null)
  }
}
