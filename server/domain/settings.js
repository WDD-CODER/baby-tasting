// The rule values of the allergen engine and their allowed ranges (pure, no I/O).
export const DEFAULT_SETTINGS = Object.freeze({
  introDays: 3,
  maintenancePerWeek: 2,
  maintenanceGapDays: 5,
  maintenanceUntilMonths: 24,
  maxAllergensPerMeal: 2,
  newFoodsPerWeek: 3,
})

export const SETTING_RANGES = Object.freeze({
  introDays: { min: 1, max: 7 },
  maintenancePerWeek: { min: 1, max: 7 },
  maintenanceGapDays: { min: 2, max: 14 },
  maintenanceUntilMonths: { min: 6, max: 36 },
  maxAllergensPerMeal: { min: 1, max: 5 },
  newFoodsPerWeek: { min: 0, max: 7 },
})

// Checks a partial set of values: every given key must be a known integer inside its range.
export function validateSettings(partial) {
  if (partial === null || typeof partial !== 'object' || Array.isArray(partial)) {
    return { ok: false, errors: [{ field: '', message: 'settings must be an object' }] }
  }
  const errors = []
  for (const [field, value] of Object.entries(partial)) {
    const range = SETTING_RANGES[field]
    if (!range) {
      errors.push({ field, message: `${field} is not a setting` })
    } else if (!Number.isInteger(value) || value < range.min || value > range.max) {
      errors.push({ field, message: `${field} must be a whole number from ${range.min} to ${range.max}` })
    }
  }
  return { ok: errors.length === 0, errors }
}

// Stored values (possibly partial or empty) over the defaults; unknown or invalid stored keys are ignored.
export function withDefaults(stored) {
  const out = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = stored?.[key]
    const range = SETTING_RANGES[key]
    if (Number.isInteger(value) && value >= range.min && value <= range.max) out[key] = value
  }
  return out
}
