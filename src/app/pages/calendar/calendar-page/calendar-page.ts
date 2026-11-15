import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { Router } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { CalendarItem, ItemPatch, Meal } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { BabyService } from '../../../core/services/baby.service'
import { CalendarService } from '../../../core/services/calendar.service'
import { CatalogService } from '../../../core/services/catalog.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { ToastService } from '../../../core/services/toast.service'
import { ageParts } from '../../../core/utils/age'
import { refusalFor, refusalMessage } from '../../../core/utils/calendar-rules'
import {
  addDays,
  addMonths,
  monthGrid,
  monthTitle,
  today,
  weekDays,
  weekStart,
  weekTitle,
} from '../../../core/utils/dates'
import { AlertStrip } from '../../../shared/ui/alert-strip/alert-strip'
import { Chip } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { IconButton } from '../../../shared/ui/icon-button/icon-button'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { AddFoodSheet } from '../add-food-sheet/add-food-sheet'
import { CalendarExtensions } from '../calendar-extensions.service'
import { Cell, MoveRequest } from '../calendar-types'
import { DaySheet } from '../day-sheet/day-sheet'
import { ItemActionsSheet } from '../item-actions-sheet/item-actions-sheet'
import { MonthView } from '../month-view/month-view'
import { WeekView } from '../week-view/week-view'

type ViewMode = 'week' | 'month'

const SWIPE_DISTANCE = 50

@Component({
  selector: 'app-calendar-page',
  imports: [
    AlertStrip,
    AddFoodSheet,
    Chip,
    DaySheet,
    ErrorState,
    IconButton,
    ItemActionsSheet,
    LoadingState,
    MonthView,
    WeekView,
  ],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly calendar = inject(CalendarService)
  private readonly catalog = inject(CatalogService)
  private readonly baby = inject(BabyService)
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  protected readonly extensions = inject(CalendarExtensions)

  protected readonly t = HE.calendar
  protected readonly today = signal(today())
  protected readonly view_ = signal<ViewMode>('week')
  protected readonly anchor_ = signal(today())
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly daySheet_ = signal<string | null>(null)
  protected readonly addFor_ = signal<Cell | null>(null)
  protected readonly actionsId_ = signal<string | null>(null)
  protected readonly items = this.calendar.items
  protected readonly foods = this.catalog.foods

  private swipeStart_: number | null = null

  protected readonly weekStart = computed(() => weekStart(this.anchor_()))
  protected readonly range = computed(() => {
    if (this.view_() === 'week') {
      const days = weekDays(this.weekStart())
      return { from: days[0], to: days[6] }
    }
    const grid = monthGrid(this.anchor_())
    return { from: grid[0], to: grid[grid.length - 1] }
  })
  protected readonly title = computed(() =>
    this.view_() === 'week' ? weekTitle(this.weekStart()) : monthTitle(this.anchor_()),
  )
  protected readonly actionsItem = computed(
    () => this.items().find((it) => it.id === this.actionsId_()) ?? null,
  )
  protected readonly actionsFood = computed(() => {
    const item = this.actionsItem()
    return item ? this.foodById(item.foodId) : undefined
  })
  protected readonly recentIds = computed(() => {
    const given = this.items()
      .filter((it) => it.status === 'given')
      .sort((a, b) => (a.date === b.date ? b.meal - a.meal : a.date < b.date ? 1 : -1))
    return [...new Set(given.map((it) => it.foodId))].slice(0, 8)
  })

  constructor() {
    this.calendar.refreshOnFocus(inject(DestroyRef))
    void this.catalog.load().catch(() => this.failed_.set(true))
    effect(() => {
      const { from, to } = this.range()
      untracked(() => void this.load(from, to))
    })
  }

  protected async load(from = this.range().from, to = this.range().to): Promise<void> {
    this.failed_.set(false)
    try {
      await this.calendar.loadRange(from, to)
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected setView(view: ViewMode): void {
    this.view_.set(view)
  }

  protected step(direction: 1 | -1): void {
    this.anchor_.update((a) =>
      this.view_() === 'week' ? addDays(a, 7 * direction) : addMonths(a, direction),
    )
  }

  protected goToday(): void {
    this.today.set(today())
    this.anchor_.set(today())
  }

  protected swipeStart(event: PointerEvent): void {
    this.swipeStart_ = event.clientX
  }

  /** Swipe left = next (the `›` button is at the left in RTL), swipe right = previous. */
  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeStart_ === null) return
    const dx = event.clientX - this.swipeStart_
    this.swipeStart_ = null
    if (Math.abs(dx) >= SWIPE_DISTANCE) this.step(dx < 0 ? 1 : -1)
  }

  protected openDay(date: string): void {
    this.daySheet_.set(date)
  }

  protected requestAdd(cell: Cell): void {
    this.addFor_.set(cell)
  }

  protected async pickFood(food: Food): Promise<void> {
    const cell = this.addFor_()
    if (!cell) return
    const refusal = refusalFor({ food, items: this.items(), date: cell.date, meal: cell.meal })
    if (refusal) {
      this.toast.show(refusalMessage(refusal), 'bad')
      return
    }
    if (this.needsWarning(food)) {
      const ok = await this.confirmDialog.confirm({
        title: food.name,
        body: food.warning?.text ?? '',
        confirmLabel: this.t.warningAddAnyway,
        cancelLabel: this.t.warningCancel,
      })
      if (!ok) return
    }
    this.addFor_.set(null)
    await this.calendar.add(cell.date, cell.meal, food.id)
  }

  protected newFood(): void {
    this.addFor_.set(null)
    void this.router.navigate(['/foods/new'], { queryParams: { returnTo: '/' } })
  }

  protected openItem(item: CalendarItem): void {
    this.actionsId_.set(item.id)
  }

  protected async patchItem(patch: ItemPatch): Promise<void> {
    const item = this.actionsItem()
    if (!item) return
    if (patch.status === 'given' && item.date > today()) {
      this.toast.show(refusalMessage('given_in_future'), 'bad')
      return
    }
    await this.calendar.update(item.id, patch)
  }

  protected async moveItem(request: MoveRequest): Promise<void> {
    const refusal = refusalFor({
      food: this.foodById(request.item.foodId),
      items: this.items(),
      date: request.date,
      meal: request.meal,
      excludeId: request.item.id,
    })
    if (refusal) {
      this.toast.show(refusalMessage(refusal), 'bad')
      return
    }
    await this.calendar.move(request.item.id, request.date, request.meal)
  }

  protected async moveFromActions(target: { date: string; meal: Meal }): Promise<void> {
    const item = this.actionsItem()
    if (!item) return
    await this.moveItem({ item, ...target })
    this.actionsId_.set(null)
  }

  protected async removeItem(): Promise<void> {
    const item = this.actionsItem()
    if (!item) return
    const ok = await this.confirmDialog.confirm({
      title: this.t.removeTitle.replace('{food}', this.actionsFood()?.name ?? ''),
      confirmLabel: this.t.remove,
      destructive: true,
    })
    if (!ok) return
    this.actionsId_.set(null)
    await this.calendar.remove(item.id)
  }

  private foodById(id: string): Food | undefined {
    return this.catalog.foodById(id)
  }

  private needsWarning(food: Food): boolean {
    const warning = food.warning
    if (!warning) return false
    if (warning.untilMonths === null) return true
    const baby = this.baby.baby()
    if (!baby) return true
    return ageParts(baby.birthDate, today()).months < warning.untilMonths
  }
}
