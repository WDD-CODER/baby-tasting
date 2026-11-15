import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { CalendarItem } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { ItemBadge } from '../calendar-extensions.service'

@Component({
  selector: 'app-item-tile',
  templateUrl: './item-tile.html',
  styleUrl: './item-tile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemTile {
  readonly item = input.required<CalendarItem>()
  readonly food = input<Food | undefined>(undefined)
  readonly badge = input<ItemBadge | null>(null)

  protected readonly t = HE.calendar

  protected readonly isAllergen = computed(() => !!this.food()?.allergenId)
  protected readonly label = computed(() => {
    const status = this.item().status
    const name = this.food()?.name ?? ''
    return status === 'given'
      ? `${name}, ${this.t.given}`
      : status === 'skipped'
        ? `${name}, ${this.t.skipped}`
        : name
  })
}
