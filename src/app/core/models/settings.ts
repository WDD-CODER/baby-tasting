export interface Settings {
  introDays: number
  maintenancePerWeek: number
  maintenanceGapDays: number
  maintenanceUntilMonths: number
  maxAllergensPerMeal: number
  newFoodsPerWeek: number
}

export type SettingKey = keyof Settings

/** The allowed range of each rule value (mirrors server/domain/settings.js). */
export const SETTING_RANGES: Record<SettingKey, { min: number; max: number }> = {
  introDays: { min: 1, max: 7 },
  maintenancePerWeek: { min: 1, max: 7 },
  maintenanceGapDays: { min: 2, max: 14 },
  maintenanceUntilMonths: { min: 6, max: 36 },
  maxAllergensPerMeal: { min: 1, max: 5 },
  newFoodsPerWeek: { min: 0, max: 7 },
}

export const SETTING_KEYS: SettingKey[] = [
  'introDays',
  'maintenancePerWeek',
  'maintenanceGapDays',
  'maintenanceUntilMonths',
  'maxAllergensPerMeal',
  'newFoodsPerWeek',
]

export interface Progress {
  tried: number
  total: number
  byCategory: { category: string; tried: number; total: number }[]
  allergensByState: Record<string, number>
}

export interface ActivityEntry {
  at: string
  user: string | null
  kind: string
  summary: { kind: string } & Record<string, string>
}
