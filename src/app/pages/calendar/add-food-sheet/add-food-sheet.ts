import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { Food } from '../../../core/models/food'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { FoodIconPipe } from '../../../shared/ui/food-icon/food-icon.pipe'

@Component({
  selector: 'app-add-food-sheet',
  imports: [BottomSheet, FoodIconPipe],
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
  /** The foods ticked in the sheet, added together with `הוספה (N)` (D-017-2). */
  readonly picked = output<Food[]>()
  /** The typed name when the search found nothing (D-017-1), otherwise an empty string. */
  readonly newFoodRequested = output<string>()

  protected readonly t = HE.calendar
  protected readonly suggestedLabel = HE.allergens.suggested
  protected readonly query_ = signal('')
  private readonly selectedIds_ = signal<readonly string[]>([])

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
  protected readonly count_ = computed(() => this.selectedIds_().length)
  protected readonly addLabel_ = computed(() =>
    this.t.addSelected.replace('{n}', String(this.count_())),
  )
  /** `הוספת "<name>" כמזון חדש` when a typed name found nothing, else `מזון חדש`. */
  protected readonly newLabel_ = computed(() => {
    const name = this.typedNewName()
    return name === '' ? this.t.newFood : this.t.newFoodNamed.replace('{name}', name)
  })

  protected onQuery(event: Event): void {
    this.query_.set((event.target as HTMLInputElement).value)
  }

  protected isSelected(food: Food): boolean {
    return this.selectedIds_().includes(food.id)
  }

  protected toggle(food: Food): void {
    this.selectedIds_.update((ids) =>
      ids.includes(food.id) ? ids.filter((id) => id !== food.id) : [...ids, food.id],
    )
  }

  protected confirm(): void {
    const byId = new Map(this.active().map((f) => [f.id, f]))
    const chosen = this.selectedIds_()
      .map((id) => byId.get(id))
      .filter((f): f is Food => f !== undefined)
    if (chosen.length === 0) return
    this.picked.emit(chosen)
    this.reset()
  }

  protected requestNew(): void {
    this.newFoodRequested.emit(this.typedNewName())
    this.reset()
  }

  protected close(): void {
    this.reset()
    this.closed.emit()
  }

  private typedNewName(): string {
    const q = this.query_().trim()
    return q !== '' && this.matches().length === 0 ? q : ''
  }

  private reset(): void {
    this.query_.set('')
    this.selectedIds_.set([])
  }
}
