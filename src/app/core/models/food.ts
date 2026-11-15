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
  status: FoodStatus
}

export interface FoodInput {
  name: string
  emoji: string
  category: FoodCategory
  allergenId: string | null
  warning: FoodWarning | null
}
