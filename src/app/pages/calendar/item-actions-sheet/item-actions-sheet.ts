import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HE } from '../../../core/i18n/he'
import { CalendarItem, ItemAmount, ItemPatch, Meal } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { Select, SelectOption } from '../../../shared/ui/select/select'
import { TextField } from '../../../shared/ui/text-field/text-field'

const AMOUNTS: ItemAmount[] = ['taste', 'teaspoon', 'portion']

@Component({
  selector: 'app-item-actions-sheet',
  imports: [FormsModule, BottomSheet, Button, Chip, Select, TextField],
  templateUrl: './item-actions-sheet.html',
  styleUrl: './item-actions-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemActionsSheet {
  readonly open = input(false)
  readonly item = input<CalendarItem | null>(null)
  readonly food = input<Food | undefined>(undefined)

  readonly mealCount = input(0)
  readonly mealOpen = input(false)

  readonly mealGiven = output<void>()
  readonly closed = output<void>()
  readonly patched = output<ItemPatch>()
  readonly moved = output<{ date: string; meal: Meal }>()
  readonly removed = output<void>()
  readonly reactionRequested = output<void>()
  readonly detailsRequested = output<void>()

  protected readonly detailsLabel = HE.foodDetail.toDetails

  protected readonly t = HE.calendar
  protected readonly amounts = AMOUNTS.map((key) => ({ key, label: HE.calendar.amounts[key] }))
  protected readonly mealOptions: SelectOption[] = [1, 2, 3].map((m) => ({
    value: String(m),
    label: `${HE.calendar.meal} ${m}`,
  }))

  protected readonly moving_ = signal(false)
  protected readonly moveDate_ = signal('')
  protected readonly moveMeal_ = signal('1')

  protected readonly mealGivenLabel = computed(() =>
    HE.calendar.mealGiven.replace('{n}', String(this.mealCount())),
  )

  protected readonly title = computed(() => this.food()?.name ?? '')

  protected toggleMove(): void {
    const item = this.item()
    if (!item) return
    this.moveDate_.set(item.date)
    this.moveMeal_.set(String(item.meal))
    this.moving_.update((v) => !v)
  }

  protected confirmMove(): void {
    const date = this.moveDate_()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    this.moved.emit({ date, meal: Number(this.moveMeal_()) as Meal })
    this.moving_.set(false)
  }

  protected setAmount(amount: ItemAmount): void {
    this.patched.emit({ amount: this.item()?.amount === amount ? null : amount })
  }

  protected onNote(event: Event): void {
    this.patched.emit({ note: (event.target as HTMLInputElement).value })
  }

  protected toggleLiked(): void {
    this.patched.emit({ liked: this.item()?.liked === true ? null : true })
  }
}
