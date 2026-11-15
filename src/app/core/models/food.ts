import { FoodCategory } from './food-category'

export interface FoodWarning {
  text: string
  /** Age in months until which the warning shows; null = always. */
  untilMonths: number | null
}

/** Derived from the `given` calendar items only (R9). */
export interface FoodStatus {
  tried: boolean
  firstDate: string | null
  timesGiven: number
  liked: boolean | null
}

export interface Food {
  id: string
  name: string
  emoji: string
  category: FoodCategory
  allergenId: string | null
  warning: FoodWarning | null
  builtIn: boolean
  archived: boolean
  /** Place in the tasting queue; null = not queued. */
  queuePosition: number | null
  status: FoodStatus
  /** Locked after a reaction, by itself or through its allergen. */
  locked?: boolean
  /** Locked by its own lock (released from the foods page). */
  foodLocked?: boolean
}

export interface FoodHistoryItem {
  id: string
  date: string
  meal: number
  amount: 'taste' | 'teaspoon' | 'portion' | null
  note: string
  liked: boolean | null
}

export interface FoodInput {
  name: string
  emoji: string
  category: FoodCategory
  allergenId: string | null
  warning: FoodWarning | null
}
