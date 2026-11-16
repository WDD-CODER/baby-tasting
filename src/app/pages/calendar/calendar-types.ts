import { CalendarItem, Meal } from '../../core/models/calendar-item'

export interface Cell {
  date: string
  meal: Meal
}

export interface MoveRequest extends Cell {
  item: CalendarItem
}

/** CDK drag start delay: a touch must be held 250 ms so scrolling still works. */
export const DRAG_START_DELAY = { touch: 250, mouse: 0 }

/** An item the server has not confirmed yet (id `tmp-n`, D-016-4): it cannot be dragged or opened. */
export function isPendingItem(item: CalendarItem): boolean {
  return item.id.startsWith('tmp-')
}
