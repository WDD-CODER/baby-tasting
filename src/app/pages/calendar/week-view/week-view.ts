import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop'
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { CalendarItem, MEALS } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { dayLetter, dayOfMonth, weekDays } from '../../../core/utils/dates'
import { ItemBadge, SuggestedItem } from '../calendar-extensions.service'
import { Cell, DRAG_START_DELAY, MoveRequest, isPendingItem } from '../calendar-types'
import { ItemTile } from '../item-tile/item-tile'

@Component({
  selector: 'app-week-view',
  imports: [CdkDrag, CdkDropList, CdkDropListGroup, ItemTile],
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekView {
  readonly weekStart = input.required<string>()
  readonly today = input.required<string>()
  readonly items = input.required<CalendarItem[]>()
  readonly foods = input.required<Food[]>()
  readonly suggested = input<SuggestedItem[]>([])
  readonly badgeFor = input<(item: CalendarItem) => ItemBadge | null>(() => null)

  readonly itemOpened = output<CalendarItem>()
  readonly addRequested = output<Cell>()
  readonly moveRequested = output<MoveRequest>()
  readonly suggestionOpened = output<SuggestedItem>()

  protected readonly t = HE.calendar
  protected readonly meals = MEALS
  protected readonly dragDelay = DRAG_START_DELAY

  private dragging_ = false
  /** D-016-4: the items as they were when a drag began; a refresh during the drag shows after the drop. */
  private readonly frozen_ = signal<CalendarItem[] | null>(null)
  private readonly shown = computed(() => this.frozen_() ?? this.items())
  protected readonly isPending = isPendingItem

  protected readonly days = computed(() => weekDays(this.weekStart()))
  protected readonly foodById = computed(() => new Map(this.foods().map((f) => [f.id, f])))
  protected readonly cells = computed(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of this.shown()) {
      const key = `${item.date}|${item.meal}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  })

  protected itemsOf(date: string, meal: number): CalendarItem[] {
    return this.cells().get(`${date}|${meal}`) ?? []
  }

  protected suggestionsOf(date: string, meal: number): SuggestedItem[] {
    return this.suggested().filter((s) => s.date === date && s.meal === meal)
  }

  protected letter(date: string): string {
    return dayLetter(date)
  }

  protected dom(date: string): number {
    return dayOfMonth(date)
  }

  protected open(item: CalendarItem): void {
    if (!this.dragging_ && !isPendingItem(item)) this.itemOpened.emit(item)
  }

  protected dragStarted(): void {
    this.dragging_ = true
    this.frozen_.set(this.items())
  }

  protected dragEnded(): void {
    setTimeout(() => {
      this.dragging_ = false
      this.frozen_.set(null)
    }, 50)
  }

  protected dropped(event: CdkDragDrop<Cell, Cell, CalendarItem>): void {
    if (event.previousContainer === event.container) return
    this.moveRequested.emit({
      item: event.item.data,
      date: event.container.data.date,
      meal: event.container.data.meal,
    })
  }
}
