import { SleepLocation } from './tracker-event'
import { ParentType } from './user'

/** The shapes of GET /api/v1/tracker/stats/:kind (server/domain/tracker/stats.js). */
export interface NutritionDay {
  date: string
  offered: number
  consumed: number
  delta: number
  feedsCount: number
  breastCount: number
  bottleCount: number
  breastMinutes: number
}

export interface NutritionStats {
  days: NutritionDay[]
  totals: {
    feedsCount: number
    breastCount: number
    bottleCount: number
    breastMinutes: number
    bottleMl: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
    feedsPerDay: number
  }
}

export interface SleepSessionStat {
  id: string
  startAt: string
  endAt: string | null
  durationMinutes: number
  location?: SleepLocation
  loggedBy: ParentType
}

export interface SleepDay {
  date: string
  totalMinutes: number
  sessionCount: number
  sessions: SleepSessionStat[]
}

export interface SleepStats {
  days: SleepDay[]
  totals: {
    totalMinutes: number
    sessionCount: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
    hoursPerDay: number
    locations: Record<SleepLocation, number>
  }
}

export interface DiaperStats {
  days: {
    date: string
    pee: number
    poo: number
    both: number
    total: number
    pooColors: string[]
    pooTextures: string[]
  }[]
  totals: {
    pee: number
    poo: number
    both: number
    total: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
    perDay: number
  }
}

export interface WeightStats {
  entries: {
    id: string
    timestamp: string
    date: string
    weightGrams: number
    percentile?: number
  }[]
  totals: {
    count: number
    latestGrams: number | null
    latestPercentile: number | null
    latestDate: string | null
    changeGrams: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
  }
}

export interface PumpingStats {
  days: { date: string; leftMl: number; rightMl: number; totalMl: number; sessionCount: number }[]
  totals: {
    leftMl: number
    rightMl: number
    totalMl: number
    sessionCount: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
    avgMlPerDay: number
    todayMl: number
  }
}

export interface VomitingStats {
  days: { date: string; small: number; medium: number; large: number; total: number }[]
  totals: {
    small: number
    medium: number
    large: number
    total: number
    rangeDays: number
    /** D-015-2: the days the averages divide by (first day with any event to the end of the range, capped at today). */
    daysWithData: number
    perDay: number
  }
}
