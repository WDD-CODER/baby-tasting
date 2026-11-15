import { FoodCategory } from './food-category'

export interface FoodWarning {
  text: string
  /** Age in months until which the warning shows; null = always. */
  untilMonths: number | null
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
}

export interface FoodInput {
  name: string
  emoji: string
  category: FoodCategory
  allergenId: string | null
  warning: FoodWarning | null
}
