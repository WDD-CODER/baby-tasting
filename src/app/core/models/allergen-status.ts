export type AllergenState = 'not_started' | 'introducing' | 'maintenance' | 'finished'
export type AlertKind = 'intro_missing' | 'maintenance_gap' | 'maintenance_week'

export interface AllergenStatus {
  allergenId: string
  state: AllergenState
  givenDays: number
  intro: {
    daysGiven: number
    required: number
    firstDay: string | null
    completedOn: string | null
    missingDays: string[]
    /** The given days the introduction counts, oldest first. */
    givenDates: string[]
  }
  lastGivenDate: string | null
  weekCount: number
  weekTarget: number
}

export interface Alert {
  id: string
  kind: AlertKind
  allergenId: string
  allergenName: string
  n?: number
  x?: number
  y?: number
}

export interface HistoryItem {
  itemId: string
  foodId: string
  foodName: string
  emoji: string
  amount: 'taste' | 'teaspoon' | 'portion' | null
}

export interface HistoryDay {
  date: string
  items: HistoryItem[]
}
