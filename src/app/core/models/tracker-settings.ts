import { ParentType } from './user'

export type BottleType = 'EXPRESSED_MILK' | 'FORMULA'
export type QuickActionId = 'meal' | 'diaper' | 'sleep' | 'activity' | 'weight' | 'vomiting'

/** The household's Tracker settings (GET/PUT /api/v1/tracker/settings). */
export interface TrackerSettings {
  parentAName: string
  parentBName: string
  defaultBottleType: BottleType
  customActivities: string[]
  quickActionOrder: QuickActionId[]
  /** Slot key → Material Symbols name. */
  iconOverrides: Record<string, string>
}

export interface CurrentParent {
  parentType: ParentType
  parentName: string
}
