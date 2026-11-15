export type Meal = 1 | 2 | 3
export type ItemStatus = 'planned' | 'given' | 'skipped'
export type ItemAmount = 'taste' | 'teaspoon' | 'portion'

export const MEALS: readonly Meal[] = [1, 2, 3]

export interface CalendarItem {
  id: string
  /** YYYY-MM-DD */
  date: string
  meal: Meal
  foodId: string
  status: ItemStatus
  amount: ItemAmount | null
  note: string
  liked: boolean | null
  givenBy: string | null
  givenAt: string | null
  /** The food or its allergen is locked after a reaction. */
  locked?: boolean
}

export interface ItemPatch {
  status?: ItemStatus
  amount?: ItemAmount | null
  note?: string
  liked?: boolean | null
}
