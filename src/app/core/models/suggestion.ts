import { Meal } from './calendar-item'

export type SuggestionKind = 'intro' | 'maintenance' | 'start' | 'new_food'

export interface SuggestionReason {
  kind: SuggestionKind
  allergenId?: string
  n?: number
  total?: number
  x?: number
  y?: number
}

/** One proposed item, exactly as `POST /suggestions/preview` returns it. */
export interface Suggestion {
  date: string
  meal: Meal
  foodId: string
  reason: SuggestionReason
}

export interface AcceptRejection {
  item: { date: string; meal: number; foodId: string }
  code: string
}
