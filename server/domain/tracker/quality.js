// Quality tiers of spec-server-data §1.4 (now shared through the API). Pure.

export const TIER_LABELS = Object.freeze({ BAD: 'דורש תשומת לב', OKAY: 'סביר', GOOD: 'טוב', GREAT: 'מצוין' })

export function classifyNutrition(nutrition) {
  if (nutrition.feedType === 'BREAST') {
    const minutes = nutrition.durationMinutes ?? 0
    if (minutes < 5) return 'BAD'
    return minutes <= 15 ? 'GOOD' : 'GREAT'
  }
  const offered = nutrition.amountOfferedMl ?? 0
  if (offered <= 0) return 'OKAY'
  const pct = ((nutrition.amountConsumedMl ?? 0) / offered) * 100
  if (pct < 50) return 'BAD'
  if (pct < 80) return 'OKAY'
  return pct < 100 ? 'GOOD' : 'GREAT'
}

export function classifySleep(durationMinutes) {
  if (durationMinutes < 30) return 'BAD'
  return durationMinutes <= 45 ? 'GOOD' : 'GREAT'
}

export function classifyDiaper(diaper) {
  if (diaper.pooTexture === 'HARD' || diaper.pooAmount === 'LARGE_OVERFLOW') return 'BAD'
  const hasPee = diaper.contains === 'PEE' || diaper.contains === 'BOTH'
  const hasPoo = diaper.contains === 'POO' || diaper.contains === 'BOTH'
  if (hasPee && diaper.peeVolume === 'LIGHT') return 'OKAY'
  if (hasPee && diaper.peeVolume === 'HEAVY_SOAKED') return 'GOOD'
  if (hasPoo) return 'GOOD'
  return 'OKAY'
}

export function classifyWeight(current, previous) {
  if (previous === null || previous === undefined) return 'OKAY'
  if (current < previous) return 'BAD'
  return current > previous ? 'GOOD' : 'OKAY'
}
