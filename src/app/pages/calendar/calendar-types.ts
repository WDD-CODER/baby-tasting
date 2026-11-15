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
