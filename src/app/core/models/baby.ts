export interface Baby {
  id: string
  name: string
  /** YYYY-MM-DD */
  birthDate: string
  /** Grams (100–7000), null when not given. */
  birthWeightGrams?: number | null
}
