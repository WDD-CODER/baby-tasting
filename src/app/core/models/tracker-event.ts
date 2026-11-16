import { BottleType } from './tracker-settings'
import { ParentType } from './user'

export type EventType =
  'NUTRITION' | 'DIAPER' | 'SLEEP' | 'ACTIVITY' | 'WEIGHT' | 'PUMPING' | 'VOMITING' | 'SUPPLEMENT'

export type FeedType = 'BREAST' | 'BOTTLE'
export type BreastSide = 'LEFT' | 'RIGHT' | 'BOTH'
export type SpitUp = 'NONE' | 'LIGHT' | 'HEAVY_VOMIT'
export type DiaperContains = 'PEE' | 'POO' | 'BOTH'
export type PeeVolume = 'LIGHT' | 'HEAVY_SOAKED'
export type PooAmount = 'SMALL' | 'MEDIUM' | 'LARGE_OVERFLOW'
export type PooColor = 'YELLOW_MUSTARD' | 'GREEN' | 'BROWN'
export type PooTexture = 'SEEDY' | 'LIQUID' | 'PASTY' | 'HARD'
export type SleepLocation = 'CRIB' | 'HANDS' | 'CARRIER' | 'STROLLER'
export type VomitingSize = 'SMALL' | 'MEDIUM' | 'LARGE'

export interface NutritionPayload {
  feedType: FeedType
  swallowingNoises?: boolean
  bottleLiquidType?: BottleType
  amountOfferedMl?: number
  amountConsumedMl?: number
  breastSide?: BreastSide
  durationMinutes?: number
  spitUp?: SpitUp
  topUp?: { liquidType: BottleType; consumedMl: number } | null
}

export interface DiaperPayload {
  contains: DiaperContains
  peeVolume?: PeeVolume
  pooAmount?: PooAmount
  pooColor?: PooColor
  pooTexture?: PooTexture
}

export interface SleepPayload {
  startAt: string
  endAt: string | null
  startLocation?: SleepLocation
  durationMinutes?: number
  startedBy?: ParentType
  endedBy?: ParentType
}

export interface TrackerEvent {
  id: string
  eventType: EventType
  /** ISO instant. */
  timestamp: string
  loggedBy: ParentType
  note?: string
  quickRecorded?: boolean
  nutrition?: NutritionPayload
  diaper?: DiaperPayload
  sleep?: SleepPayload
  activity?: { activityName: string; cryingIntensity?: number }
  weight?: { weightGrams: number; percentile?: number }
  pumping?: { leftAmountMl: number; rightAmountMl: number }
  vomiting?: { size: VomitingSize }
  supplement?: { name: string }
}

/** The body of POST /tracker/events (the server decides id and who logged it). */
export type NewTrackerEvent = Omit<TrackerEvent, 'id' | 'loggedBy' | 'timestamp'> & {
  timestamp?: string
  /** D-016-3: end the open sleep at this event's time, then save the event. */
  endOpenSleep?: boolean
}
