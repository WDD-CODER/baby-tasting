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
import { ActivatedRoute, Router } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { CalendarItem, ItemPatch, Meal } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { AllergenStatusService } from '../../../core/services/allergen-status.service'
import { BabyService } from '../../../core/services/baby.service'
import { CalendarService } from '../../../core/services/calendar.service'
import { CatalogService } from '../../../core/services/catalog.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { SuggestionsService } from '../../../core/services/suggestions.service'
import { ToastService } from '../../../core/services/toast.service'
import { ageParts } from '../../../core/utils/age'
import { alertText } from '../../../core/utils/alerts'
import {
  isAllergenOutsideMeal1,
  refusalFor,
  refusalMessage,
} from '../../../core/utils/calendar-rules'
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
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { IconButton } from '../../../shared/ui/icon-button/icon-button'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { AddFoodSheet } from '../add-food-sheet/add-food-sheet'
import { CalendarHint } from '../calendar-hint/calendar-hint'
import { CalendarExtensions, ItemBadge, SuggestedItem } from '../calendar-extensions.service'
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
    BottomSheet,
    Button,
    CalendarHint,
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
  private readonly allergenStatus = inject(AllergenStatusService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly suggestions = inject(SuggestionsService)
  protected readonly extensions = inject(CalendarExtensions)

  protected readonly t = HE.calendar
  protected readonly alertsT = HE.alerts
  protected readonly today = signal(today())
  protected readonly view_ = signal<ViewMode>('week')
  protected readonly anchor_ = signal(today())
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly daySheet_ = signal<string | null>(null)
  protected readonly addFor_ = signal<Cell | null>(null)
  protected readonly preselect_ = signal<string | null>(null)
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
  protected readonly suggestT = HE.suggestions
  protected readonly suggesting_ = signal(false)
  protected readonly suggestionId_ = signal<string | null>(null)
  protected readonly openedSuggestion = computed(
    () => this.extensions.suggested().find((s) => s.id === this.suggestionId_()) ?? null,
  )
  protected readonly openedSuggestionFood = computed(() => {
    const item = this.openedSuggestion()
    return item ? this.foodById(item.foodId) : undefined
  })
  protected readonly suggestionBarText = computed(() =>
    this.suggestT.count.replace('{n}', String(this.extensions.suggested().length)),
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
    void this.catalog
      .load()
      .then(() => this.openAddFromQuery())
      .catch(() => this.failed_.set(true))
    void this.allergenStatus.refresh()
    this.extensions.onAlertAction.set((id) => this.openAlert(id))
    this.extensions.onSuggestionAccept.set((item) => void this.acceptSuggestions([item]))
    this.extensions.onSuggestionDismiss.set((item) => this.dismissSuggestion(item))
    effect(() => {
      // a proposal belongs to the week and view it was made for
      this.weekStart()
      this.view_()
      untracked(() => this.dismissAllSuggestions())
    })
    effect(() => {
      const alerts = this.allergenStatus.alerts()
      this.extensions.alerts.set(
        alerts.map((a) => ({ id: a.id, tone: 'bad' as const, text: alertText(a), tappable: true })),
      )
    })
    effect(() => {
      const byId = this.allergenStatus.byAllergenId()
      this.extensions.badgeFor.set((item: CalendarItem) => this.badgeOf(item, byId))
    })
    effect(() => {
      const { from, to } = this.range()
      untracked(() => void this.load(from, to))
    })
  }

  /** `/?add=<foodId>` (from the food page) opens the add-food sheet for today with that food preselected. */
  private openAddFromQuery(): void {
    const foodId = this.route.snapshot.queryParamMap.get('add')
    if (!foodId) return
    const food = this.foodById(foodId)
    void this.router.navigate([], {
      queryParams: { add: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
    if (!food) return
    this.preselect_.set(food.id)
    this.addFor_.set({ date: today(), meal: food.allergenId ? 1 : 2 })
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
    this.preselect_.set(null)
    this.addFor_.set(cell)
  }

  /** An alert opens the add-food sheet for today, meal 1, with the allergen's last given (or first) food suggested. */
  protected openAlert(id: string): void {
    const alert = this.allergenStatus.alerts().find((a) => a.id === id)
    if (!alert) return
    if (alert.kind === 'locked') {
      void this.router.navigate(['/tasting/allergens'])
      return
    }
    const foods = this.foods()
      .filter((f) => f.allergenId === alert.allergenId)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'))
    const lastGiven = this.items()
      .filter((it) => it.status === 'given' && foods.some((f) => f.id === it.foodId))
      .sort((a, b) => (a.date === b.date ? b.meal - a.meal : a.date < b.date ? 1 : -1))[0]
    this.preselect_.set(lastGiven?.foodId ?? foods[0]?.id ?? null)
    this.addFor_.set({ date: today(), meal: 1 })
  }

  /** `הצע לי שבוע`: asks the server for a proposal for the visible week; nothing is saved. */
  protected async suggestWeek(): Promise<void> {
    if (this.suggesting_()) return
    this.suggesting_.set(true)
    try {
      const list = await this.suggestions.preview(this.weekStart())
      this.extensions.suggested.set(
        list.map((s) => ({ ...s, id: `${s.date}|${s.meal}|${s.foodId}` })),
      )
      if (list.length === 0) this.toast.show(this.suggestT.nothing)
    } catch {
      this.toast.show(this.suggestT.failed, 'bad')
    } finally {
      this.suggesting_.set(false)
    }
  }

  protected openSuggestion(item: SuggestedItem): void {
    this.suggestionId_.set(item.id)
  }

  protected closeSuggestion(): void {
    this.suggestionId_.set(null)
  }

  protected reasonText(item: SuggestedItem | null): string {
    const reason = item?.reason
    if (!reason) return ''
    const allergen = reason.allergenId
      ? (this.catalog.allergenById().get(reason.allergenId)?.name ?? '')
      : ''
    return this.suggestT.reason[reason.kind]
      .replace('{allergen}', allergen)
      .replace('{n}', String(reason.n ?? ''))
      .replace('{total}', String(reason.total ?? ''))
      .replace('{x}', String(reason.x ?? ''))
      .replace('{y}', String(reason.y ?? ''))
  }

  protected dismissSuggestion(item: SuggestedItem): void {
    this.extensions.suggested.update((list) => list.filter((s) => s.id !== item.id))
    this.suggestionId_.set(null)
  }

  protected dismissAllSuggestions(): void {
    this.extensions.suggested.set([])
    this.suggestionId_.set(null)
  }

  protected async acceptSuggestions(items: SuggestedItem[]): Promise<void> {
    if (items.length === 0 || this.suggesting_()) return
    this.suggesting_.set(true)
    try {
      const res = await this.suggestions.accept(
        items.map((s) => ({ date: s.date, meal: s.meal, foodId: s.foodId })),
      )
      const gone = new Set(items.map((s) => s.id))
      this.extensions.suggested.update((list) => list.filter((s) => !gone.has(s.id)))
      this.suggestionId_.set(null)
      if (res.rejected.length > 0) this.toast.show(this.suggestT.someRejected, 'bad')
      await this.calendar.refresh()
    } catch {
      this.toast.show(HE.calendar.errors.notSaved, 'bad')
    } finally {
      this.suggesting_.set(false)
    }
  }

  protected closeAdd(): void {
    this.addFor_.set(null)
    this.preselect_.set(null)
  }

  protected async pickFood(food: Food): Promise<void> {
    const cell = this.addFor_()
    if (!cell) return
    const refusal = refusalFor({ food, items: this.items(), date: cell.date, meal: cell.meal })
    if (refusal) {
      this.toast.show(refusalMessage(refusal, food.name), 'bad')
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
    if (!(await this.confirmStartAnother(food))) return
    this.closeAdd()
    const saved = await this.calendar.add(cell.date, cell.meal, food.id)
    if (saved) this.noteAllergenMeal(food, cell.meal)
  }

  protected newFood(): void {
    this.addFor_.set(null)
    void this.router.navigate(['/tasting/foods/new'], { queryParams: { returnTo: '/tasting' } })
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
    const movedFood = this.foodById(request.item.foodId)
    const refusal = refusalFor({
      food: movedFood,
      items: this.items(),
      date: request.date,
      meal: request.meal,
      excludeId: request.item.id,
    })
    if (refusal) {
      this.toast.show(refusalMessage(refusal, movedFood?.name ?? ''), 'bad')
      return
    }
    const saved = await this.calendar.move(request.item.id, request.date, request.meal)
    if (saved) this.noteAllergenMeal(movedFood, request.meal)
  }

  /** D-015-4: a soft note (never a refusal) when an allergen food ends up in meal 2 or 3. */
  private noteAllergenMeal(food: Food | undefined, meal: Meal): void {
    if (isAllergenOutsideMeal1(food, meal)) this.toast.show(HE.calendar.errors.allergenOutsideMeal1)
  }

  protected openReaction(): void {
    const item = this.actionsItem()
    if (!item) return
    this.actionsId_.set(null)
    void this.router.navigate(['/tasting/reactions/new'], { queryParams: { itemId: item.id } })
  }

  protected openDetails(): void {
    const item = this.actionsItem()
    if (!item) return
    this.actionsId_.set(null)
    void this.router.navigate(['/tasting/foods', item.foodId])
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

  /** R3: starting a new allergen while another one is being introduced asks first (never blocks). */
  private async confirmStartAnother(food: Food): Promise<boolean> {
    if (!food.allergenId) return true
    const states = this.allergenStatus.status()
    if (states.find((s) => s.allergenId === food.allergenId)?.state !== 'not_started') return true
    const current = states.find((s) => s.state === 'introducing')
    if (!current) return true
    const names = this.catalog.allergenById()
    return this.confirmDialog.confirm({
      title: HE.allergens.startAnother
        .replace('{current}', names.get(current.allergenId)?.name ?? '')
        .replace('{new}', names.get(food.allergenId)?.name ?? ''),
      confirmLabel: HE.allergens.startAnotherConfirm,
      cancelLabel: HE.allergens.startAnotherCancel,
    })
  }

  private badgeOf(
    item: CalendarItem,
    byId: ReturnType<AllergenStatusService['byAllergenId']>,
  ): ItemBadge | null {
    if (item.locked) return { text: HE.locks.badge, tone: 'bad' }
    const allergenId = this.foodById(item.foodId)?.allergenId
    const state = allergenId ? byId.get(allergenId) : undefined
    if (!state) return null
    if (state.state === 'introducing' && item.status === 'given') {
      const ordinal = state.intro.givenDates.indexOf(item.date) + 1
      return ordinal > 0 ? { text: `${ordinal}/${state.intro.required}`, tone: 'okay' } : null
    }
    if (state.state === 'maintenance') return { text: '', tone: 'good' }
    return null
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
