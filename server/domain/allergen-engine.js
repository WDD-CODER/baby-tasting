// The allergen rules engine (pure): state, progress and alerts of every allergen, computed from the history.
// Nothing here is stored; the caller passes birth date, settings, catalog, given items and today.
import { ageInMonths, dayOfWeek, isoAddDays, isoDiffDays, weekStartSunday } from './dates.js'

const WEEKLY_ALERT_FROM_DAY = 4 // Thursday (Sunday = 0)

// Layers the active locks onto the computed result: a locked allergen keeps its computed state in `baseState`,
// loses its reminder alerts and gets exactly one `locked` alert. `locks` are `{ targetType, targetId }`.
const REMINDER_KINDS = new Set(['intro_missing', 'maintenance_gap', 'maintenance_week'])

export function applyLocks(result, locks = []) {
  const lockedIds = new Set(locks.filter((l) => l.targetType === 'allergen').map((l) => l.targetId))
  if (lockedIds.size === 0) return result
  const allergens = result.allergens.map((entry) =>
    lockedIds.has(entry.allergenId) ? { ...entry, baseState: entry.state, state: 'locked' } : entry,
  )
  const alerts = result.alerts.filter((a) => !(REMINDER_KINDS.has(a.kind) && lockedIds.has(a.allergenId)))
  for (const entry of allergens) {
    if (entry.state === 'locked') alerts.push({ id: 'locked:' + entry.allergenId, kind: 'locked', allergenId: entry.allergenId })
  }
  return { ...result, allergens, alerts }
}

function datesBetween(afterDay, beforeDay) {
  const out = []
  for (let d = isoAddDays(afterDay, 1); d < beforeDay; d = isoAddDays(d, 1)) out.push(d)
  return out
}

function computeOne({ allergen, givenDays, birthDate, settings, today }) {
  const weekStart = weekStartSunday(today)
  const required = settings.introDays
  const firstDay = givenDays[0] ?? null
  const completedOn = givenDays.length >= required ? givenDays[required - 1] : null
  const lastGivenDate = givenDays.length ? givenDays[givenDays.length - 1] : null
  const weekCount = givenDays.filter((d) => d >= weekStart && d <= today).length
  const given = new Set(givenDays)

  let state = 'not_started'
  if (firstDay) {
    if (!completedOn) state = 'introducing'
    else if (birthDate && ageInMonths(birthDate, today) >= settings.maintenanceUntilMonths) state = 'finished'
    else state = 'maintenance'
  }

  const missingDays = state === 'introducing' ? datesBetween(firstDay, today).filter((d) => !given.has(d)) : []

  const entry = {
    allergenId: allergen.id,
    state,
    givenDays: givenDays.length,
    intro: {
      daysGiven: Math.min(givenDays.length, required),
      required,
      firstDay,
      completedOn,
      missingDays,
      givenDates: givenDays.slice(0, required),
    },
    lastGivenDate,
    weekCount,
    weekTarget: settings.maintenancePerWeek,
  }

  let alert = null
  if (state === 'introducing' && missingDays.length > 0 && !given.has(today)) {
    alert = { id: 'intro_missing:' + allergen.id, kind: 'intro_missing', allergenId: allergen.id }
  } else if (state === 'maintenance') {
    const sinceLast = isoDiffDays(lastGivenDate, today)
    if (sinceLast > settings.maintenanceGapDays) {
      alert = { id: 'maintenance_gap:' + allergen.id, kind: 'maintenance_gap', allergenId: allergen.id, n: sinceLast }
    } else if (
      dayOfWeek(today) >= WEEKLY_ALERT_FROM_DAY &&
      weekCount < settings.maintenancePerWeek &&
      completedOn < weekStart
    ) {
      alert = {
        id: 'maintenance_week:' + allergen.id,
        kind: 'maintenance_week',
        allergenId: allergen.id,
        x: weekCount,
        y: settings.maintenancePerWeek,
      }
    }
  }
  return { entry, alert }
}

export function computeAllergens({ birthDate = null, settings, allergens, foods, items, today, locks = [] }) {
  const allergenOfFood = new Map(foods.map((f) => [f.id, f.allergenId]))
  const daysByAllergen = new Map()
  for (const item of items) {
    if (item.status !== 'given' || item.date > today) continue
    const allergenId = allergenOfFood.get(item.foodId)
    if (!allergenId) continue
    if (!daysByAllergen.has(allergenId)) daysByAllergen.set(allergenId, new Set())
    daysByAllergen.get(allergenId).add(item.date)
  }

  const result = { allergens: [], alerts: [] }
  for (const allergen of allergens) {
    if (allergen.archived) continue
    const givenDays = [...(daysByAllergen.get(allergen.id) ?? [])].sort()
    const { entry, alert } = computeOne({ allergen, givenDays, birthDate, settings, today })
    result.allergens.push(entry)
    if (alert) result.alerts.push(alert)
  }
  return applyLocks(result, locks)
}
