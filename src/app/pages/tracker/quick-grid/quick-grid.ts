import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { DiaperContains, VomitingSize } from '../../../core/models/tracker-event'
import { QuickActionId } from '../../../core/models/tracker-settings'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { Icon } from '../../../shared/ui/icon/icon'
import { AwakeWidget } from '../awake-widget/awake-widget'
import { QuickLogService } from '../quick-log.service'
import { SheetType } from '../sheet-type'
import { SleepTimer } from '../sleep-timer/sleep-timer'
import {
  awakeMinutes,
  babyDayEvents,
  clock,
  feedingCountdown,
} from '../../../core/utils/tracker-rules'

const LONG_PRESS_MS = 550
const MOVE_LIMIT_PX = 10

export const DEFAULT_ORDER: QuickActionId[] = [
  'meal',
  'diaper',
  'sleep',
  'activity',
  'weight',
  'vomiting',
]

/** Known ids in the saved order, unknown ids dropped, missing ids appended in default order (spec §4.5). */
export function reconcileOrder(saved: readonly string[] | undefined): QuickActionId[] {
  const known = (saved ?? []).filter((id): id is QuickActionId =>
    (DEFAULT_ORDER as string[]).includes(id),
  )
  const unique = known.filter((id, i) => known.indexOf(id) === i)
  return [...unique, ...DEFAULT_ORDER.filter((id) => !unique.includes(id))]
}

interface Press {
  id: QuickActionId
  x: number
  y: number
  timer: ReturnType<typeof setTimeout>
  fired: boolean
}

const SHEET_OF: Partial<Record<QuickActionId, SheetType>> = {
  meal: 'bottle',
  diaper: 'diaper',
  sleep: 'sleep',
  activity: 'activity',
  weight: 'weight',
  vomiting: 'vomiting',
}

/** The quick-action area: quick panels, awake widget, reorder toggle and the reorderable buttons (spec §4.2-§4.5). */
@Component({
  selector: 'app-quick-grid',
  imports: [CdkDropList, CdkDrag, Icon, AwakeWidget, SleepTimer],
  templateUrl: './quick-grid.html',
  styleUrl: './quick-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickGrid {
  private readonly events = inject(TrackerEventsService)
  private readonly settings = inject(TrackerSettingsService)
  private readonly quick = inject(QuickLogService)
  private readonly toast = inject(ToastService)

  readonly bathActive = input(false)
  readonly openSheet = output<SheetType>()

  protected readonly t = HE.tracker.log
  protected readonly diaperOptions: { id: DiaperContains; emoji: string }[] = [
    { id: 'PEE', emoji: '💦' },
    { id: 'POO', emoji: '💩' },
    { id: 'BOTH', emoji: '💦💩' },
  ]
  protected readonly vomitingOptions: { id: VomitingSize; emoji: string; label: string }[] = [
    { id: 'SMALL', emoji: '💧', label: HE.tracker.log.vomitingSizes.SMALL },
    { id: 'MEDIUM', emoji: '💦', label: HE.tracker.log.vomitingSizes.MEDIUM },
    { id: 'LARGE', emoji: '⚠️', label: HE.tracker.log.vomitingSizes.LARGE },
  ]

  private readonly order_ = signal<QuickActionId[]>(DEFAULT_ORDER)
  private readonly reorder_ = signal(false)
  private readonly diaperPanel_ = signal(false)
  private readonly vomitingPanel_ = signal(false)
  private readonly pressed_ = signal<QuickActionId | null>(null)
  private press_: Press | null = null

  protected readonly order = this.order_.asReadonly()
  protected readonly reorder = this.reorder_.asReadonly()
  protected readonly diaperPanel = this.diaperPanel_.asReadonly()
  protected readonly vomitingPanel = this.vomitingPanel_.asReadonly()
  protected readonly pressed = this.pressed_.asReadonly()

  protected readonly openSleep = this.events.openSleep
  protected readonly now = this.events.now
  protected readonly day = computed(() => babyDayEvents(this.events.events(), this.now()))
  protected readonly bottles = computed(
    () =>
      this.day().filter(
        (e) =>
          e.eventType === 'NUTRITION' && !e.quickRecorded && e.nutrition?.feedType === 'BOTTLE',
      ).length,
  )
  protected readonly breasts = computed(
    () =>
      this.day().filter((e) => e.eventType === 'NUTRITION' && e.nutrition?.feedType === 'BREAST')
        .length,
  )
  protected readonly pee = computed(
    () => this.day().filter((e) => e.diaper?.contains === 'PEE').length,
  )
  protected readonly poo = computed(
    () => this.day().filter((e) => e.diaper?.contains === 'POO').length,
  )
  protected readonly both = computed(
    () => this.day().filter((e) => e.diaper?.contains === 'BOTH').length,
  )
  protected readonly countdown = computed(() => feedingCountdown(this.events.events(), this.now()))
  protected readonly countdownText = computed(() => {
    const c = this.countdown()
    if (!c.isOverdue) return this.t.nextFeedingLabel.replace('{t}', clock(c.remainingMs))
    return this.openSleep() ? this.t.feedingOverdueAsleep : this.t.feedingOverdue
  })
  protected readonly awake = computed(() => awakeMinutes(this.events.events(), this.now()))
  protected readonly showAwake = computed(() => !this.openSleep())

  constructor() {
    effect(() => {
      const saved = this.settings.settings()?.quickActionOrder
      this.order_.set(reconcileOrder(saved))
    })
  }

  protected countsText(): string {
    return this.t.mealCounts
      .replace('{b}', String(this.bottles()))
      .replace('{n}', String(this.breasts()))
  }

  protected toggleReorder(): void {
    if (this.reorder_()) void this.saveOrder()
    else this.reorder_.set(true)
  }

  protected drop(event: CdkDragDrop<QuickActionId[]>): void {
    const next = [...this.order_()]
    const [moved] = next.splice(event.previousIndex, 1)
    next.splice(event.currentIndex, 0, moved)
    this.order_.set(next)
  }

  protected closeDiaper(): void {
    this.diaperPanel_.set(false)
  }

  protected closeVomiting(): void {
    this.vomitingPanel_.set(false)
  }

  protected async quickDiaper(contains: DiaperContains): Promise<void> {
    if (await this.quick.diaper(contains)) this.diaperPanel_.set(false)
  }

  protected async quickVomiting(size: VomitingSize): Promise<void> {
    if (await this.quick.vomiting(size)) this.vomitingPanel_.set(false)
  }

  protected openFull(id: QuickActionId): void {
    const sheet = SHEET_OF[id]
    if (sheet) this.openSheet.emit(sheet)
  }

  protected onDown(id: QuickActionId, event: PointerEvent): void {
    if (this.reorder_() || event.button !== 0) return
    this.cancelPress()
    const press: Press = {
      id,
      x: event.clientX,
      y: event.clientY,
      fired: false,
      timer: setTimeout(() => {
        press.fired = true
        this.pressed_.set(null)
        navigator.vibrate?.(50)
        this.openFull(id)
      }, LONG_PRESS_MS),
    }
    this.press_ = press
    this.pressed_.set(id)
  }

  protected onMove(event: PointerEvent): void {
    const p = this.press_
    if (!p || p.fired) return
    if (
      Math.abs(event.clientX - p.x) > MOVE_LIMIT_PX ||
      Math.abs(event.clientY - p.y) > MOVE_LIMIT_PX
    )
      this.cancelPress()
  }

  protected onUp(id: QuickActionId, event: PointerEvent): void {
    const p = this.press_
    if (!p || p.id !== id) return
    const moved =
      Math.abs(event.clientX - p.x) > MOVE_LIMIT_PX || Math.abs(event.clientY - p.y) > MOVE_LIMIT_PX
    const fired = p.fired
    this.cancelPress()
    if (fired || moved) return
    this.shortPress(id)
  }

  protected cancelPress(): void {
    if (this.press_) clearTimeout(this.press_.timer)
    this.press_ = null
    this.pressed_.set(null)
  }

  private shortPress(id: QuickActionId): void {
    if (id === 'meal') void this.quick.meal()
    else if (id === 'diaper') this.diaperPanel_.update((open) => !open)
    else if (id === 'sleep') void this.quick.sleep()
    else if (id === 'vomiting') this.vomitingPanel_.update((open) => !open)
  }

  private async saveOrder(): Promise<void> {
    this.reorder_.set(false)
    try {
      await this.settings.save({ quickActionOrder: this.order_() })
      this.toast.show(this.t.reorderSaved, 'good')
    } catch {
      this.toast.show(this.t.reorderFailed, 'bad')
    }
  }
}
