import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { CalendarItem } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { dayOfMonth, monthGrid } from '../../../core/utils/dates'

const MAX_EMOJI = 4

interface DayCell {
  date: string
  inMonth: boolean
  emoji: string[]
  more: number
}

@Component({
  selector: 'app-month-view',
  templateUrl: './month-view.html',
  styleUrl: './month-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthView {
  /** Any date inside the visible month. */
  readonly month = input.required<string>()
  readonly today = input.required<string>()
  readonly items = input.required<CalendarItem[]>()
  readonly foods = input.required<Food[]>()

  readonly dayOpened = output<string>()

  protected readonly t = HE.calendar
  protected readonly letters = HE.calendar.dayLetters

  protected readonly cells = computed<DayCell[]>(() => {
    const foodById = new Map(this.foods().map((f) => [f.id, f]))
    const byDate = new Map<string, CalendarItem[]>()
    for (const item of this.items()) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item])
    const prefix = this.month().slice(0, 7)
    return monthGrid(this.month()).map((date) => {
      // allergen items first, then by meal
      const sorted = [...(byDate.get(date) ?? [])].sort((a, b) => {
        const aa = foodById.get(a.foodId)?.allergenId ? 0 : 1
        const ba = foodById.get(b.foodId)?.allergenId ? 0 : 1
        return aa - ba || a.meal - b.meal
      })
      return {
        date,
        inMonth: date.startsWith(prefix),
        emoji: sorted.slice(0, MAX_EMOJI).map((it) => foodById.get(it.foodId)?.emoji ?? ''),
        more: Math.max(0, sorted.length - MAX_EMOJI),
      }
    })
  })

  protected dom(date: string): number {
    return dayOfMonth(date)
  }
}
