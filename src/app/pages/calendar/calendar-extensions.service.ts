import { Injectable, signal } from '@angular/core'
import { AlertItem } from '../../shared/ui/alert-strip/alert-strip'
import { CalendarItem, Meal } from '../../core/models/calendar-item'
import { SuggestionReason } from '../../core/models/suggestion'

export type AlertStripItem = AlertItem

export interface ItemBadge {
  text: string
  /** State colour of the badge; no tone keeps the neutral dot. */
  tone?: 'okay' | 'good'
}

export interface SuggestedItem {
  id: string
  date: string
  meal: Meal
  foodId: string
  reason?: SuggestionReason
}

/**
 * Named extension points of the calendar (plans 005–007 only set these signals):
 * alerts above the calendar, a badge per item, and suggested (dashed) items.
 */
@Injectable({ providedIn: 'root' })
export class CalendarExtensions {
  readonly alerts = signal<AlertStripItem[]>([])
  readonly badgeFor = signal<(item: CalendarItem) => ItemBadge | null>(() => null)
  readonly suggested = signal<SuggestedItem[]>([])
  readonly onAlertAction = signal<(id: string) => void>(() => undefined)
  readonly onSuggestionAccept = signal<(item: SuggestedItem) => void>(() => undefined)
  readonly onSuggestionDismiss = signal<(item: SuggestedItem) => void>(() => undefined)
}
