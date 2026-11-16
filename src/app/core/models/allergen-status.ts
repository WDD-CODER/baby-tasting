export type AllergenState = 'not_started' | 'introducing' | 'maintenance' | 'finished' | 'locked'
export type AlertKind = 'intro_missing' | 'maintenance_gap' | 'maintenance_week' | 'locked'

export interface AllergenStatus {
  allergenId: string
  state: AllergenState
  /** The computed state under a lock. */
  baseState?: AllergenState
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
  /** Absent on the alert of a locked regular food. */
  allergenId?: string
  foodId?: string
  allergenName?: string
  /** `locked` alerts: the allergen or food name and its future planned items. */
  targetName?: string
  plannedCount?: number
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
