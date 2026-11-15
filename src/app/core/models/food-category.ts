import { HE } from '../i18n/he'

export type FoodCategory =
  'vegetables' | 'fruits' | 'grains' | 'legumes' | 'proteins' | 'dairy' | 'allergens' | 'other'

/** Display order of the categories. */
export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  'vegetables',
  'fruits',
  'grains',
  'legumes',
  'proteins',
  'dairy',
  'allergens',
  'other',
]

export function categoryLabel(category: FoodCategory): string {
  return HE.foods.categories[category]
}
