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
import { BioGayaCard, bioGayaGiven } from '../bio-gaya-card/bio-gaya-card'
import { HomeCard } from '../home-card/home-card'
import { HomeLayoutService } from '../home-layout.service'
import { HE } from '../../../core/i18n/he'
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
    HomeCard,
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
  private readonly layout = inject(HomeLayoutService)

  private readonly sheet_ = signal<SheetType | null>(null)
  protected readonly sheet = this.sheet_.asReadonly()

  protected readonly now = this.events.now
  protected readonly day = computed(() => babyDayEvents(this.events.events(), this.now()))
  protected readonly bathActive = this.reminders.bathActive
  protected readonly t = HE.tracker.log
  protected readonly editing = this.layout.editing
  protected readonly hasBioGaya = computed(() => bioGayaGiven(this.day()) !== null)

  constructor() {
    // Load, then refresh every 5 s while visible and on focus (spec §1.4); stop when the page goes away.
    this.events.start()
    inject(DestroyRef).onDestroy(() => this.events.stop())
  }

  protected toggleEdit(): void {
    if (this.layout.editing()) void this.layout.finish()
    else this.layout.start()
  }

  protected open(type: SheetType): void {
    this.sheet_.set(type)
  }

  protected close(): void {
    this.sheet_.set(null)
  }
}
