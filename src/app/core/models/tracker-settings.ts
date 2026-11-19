import { ParentType } from './user'

export type BottleType = 'EXPRESSED_MILK' | 'FORMULA'
export type QuickActionId = 'meal' | 'diaper' | 'sleep' | 'activity' | 'weight' | 'vomiting'
export type HomeCardId = 'today' | 'quick' | 'diaper' | 'pumping' | 'biogaya'

/** The household's Tracker settings (GET/PUT /api/v1/tracker/settings). */
export interface TrackerSettings {
  parentAName: string
  parentBName: string
  defaultBottleType: BottleType
  customActivities: string[]
  quickActionOrder: QuickActionId[]
  /** Quick-action buttons shown as small chips under the grid. */
  quickActionsMinimized: QuickActionId[]
  /** Home containers folded to one bar. */
  homeCardsMinimized: HomeCardId[]
  /** Slot key → Material Symbols name. */
  iconOverrides: Record<string, string>
}

export interface CurrentParent {
  parentType: ParentType
  parentName: string
}
