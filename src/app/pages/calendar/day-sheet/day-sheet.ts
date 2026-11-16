import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop'
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { CalendarItem, MEALS } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { dayTitle } from '../../../core/utils/dates'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { ItemBadge } from '../calendar-extensions.service'
import { Cell, DRAG_START_DELAY, MoveRequest, isPendingItem } from '../calendar-types'
import { ItemTile } from '../item-tile/item-tile'

@Component({
  selector: 'app-day-sheet',
  imports: [BottomSheet, CdkDrag, CdkDropList, CdkDropListGroup, ItemTile],
  templateUrl: './day-sheet.html',
  styleUrl: './day-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaySheet {
  readonly open = input(false)
  readonly date = input.required<string>()
  readonly items = input.required<CalendarItem[]>()
  readonly foods = input.required<Food[]>()
  readonly badgeFor = input<(item: CalendarItem) => ItemBadge | null>(() => null)

  readonly closed = output<void>()
  readonly itemOpened = output<CalendarItem>()
  readonly addRequested = output<Cell>()
  readonly moveRequested = output<MoveRequest>()

  protected readonly t = HE.calendar
  protected readonly meals = MEALS
  protected readonly dragDelay = DRAG_START_DELAY

  private dragging_ = false
  /** D-016-4: the items as they were when a drag began; a refresh during the drag shows after the drop. */
  private readonly frozen_ = signal<CalendarItem[] | null>(null)
  private readonly shown = computed(() => this.frozen_() ?? this.items())
  protected readonly isPending = isPendingItem

  protected readonly title = computed(() => dayTitle(this.date()))
  protected readonly foodById = computed(() => new Map(this.foods().map((f) => [f.id, f])))

  protected itemsOf(meal: number): CalendarItem[] {
    return this.shown().filter((it) => it.date === this.date() && it.meal === meal)
  }

  protected foodOf(item: CalendarItem): Food | undefined {
    return this.foodById().get(item.foodId)
  }

  protected statusText(item: CalendarItem): string {
    const parts: string[] = []
    if (item.status === 'given') parts.push(this.t.given)
    if (item.status === 'skipped') parts.push(this.t.skipped)
    if (item.status === 'given' && item.amount) parts.push(this.t.amounts[item.amount])
    return parts.join(' · ')
  }

  protected openItem(item: CalendarItem): void {
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
