import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { Food } from '../../../core/models/food'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'

@Component({
  selector: 'app-add-food-sheet',
  imports: [BottomSheet],
  templateUrl: './add-food-sheet.html',
  styleUrl: './add-food-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddFoodSheet {
  readonly open = input(false)
  readonly foods = input.required<Food[]>()
  /** Ids of the most recently given foods, newest first (at most 8). */
  readonly recentIds = input<string[]>([])
  /** A food an alert suggests: shown first and marked; the parent still taps it to add. */
  readonly preselectFoodId = input<string | null>(null)

  readonly closed = output<void>()
  readonly picked = output<Food>()
  readonly newFoodRequested = output<void>()

  protected readonly t = HE.calendar
  protected readonly suggestedLabel = HE.allergens.suggested
  protected readonly query_ = signal('')

  protected readonly active = computed(() =>
    this.foods()
      .filter((f) => !f.archived)
      .sort((a, b) => a.name.localeCompare(b.name, 'he')),
  )
  protected readonly matches = computed(() => {
    const q = this.query_().trim().toLowerCase()
    return q === '' ? this.active() : this.active().filter((f) => f.name.toLowerCase().includes(q))
  })
  protected readonly preselected = computed(() => {
    const id = this.preselectFoodId()
    return this.active().find((f) => f.id === id) ?? null
  })
  protected readonly recent = computed(() => {
    if (this.query_().trim() !== '') return []
    const byId = new Map(this.active().map((f) => [f.id, f]))
    return this.recentIds()
      .map((id) => byId.get(id))
      .filter((f): f is Food => f !== undefined)
      .slice(0, 8)
  })

  protected onQuery(event: Event): void {
    this.query_.set((event.target as HTMLInputElement).value)
  }

  protected pick(food: Food): void {
    this.picked.emit(food)
    this.query_.set('')
  }

  protected close(): void {
    this.query_.set('')
    this.closed.emit()
  }
}
