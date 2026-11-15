// Small template table: an audit-field change becomes `{ kind, ...params }`; the frontend resolves `kind` to Hebrew text.
export function calendarSummary(item, foodName) {
  const kind = item.status === 'given' ? 'calendar.given' : 'calendar.planned'
  return { kind, foodName, date: item.date }
}

export function foodSummary(food) {
  return { kind: food.archived === true ? 'food.archived' : 'food.saved', foodName: food.name }
}

export function allergenSummary(allergen) {
  return { kind: allergen.archived === true ? 'allergen.archived' : 'allergen.saved', allergenName: allergen.name }
}

export function reactionSummary() {
  return { kind: 'reaction.saved' }
}

export function lockSummary(lock, targetName) {
  return { kind: lock.releasedAt ? 'lock.released' : 'lock.locked', targetName }
}

export function babySummary() {
  return { kind: 'baby.saved' }
}

export function settingsSummary() {
  return { kind: 'settings.saved' }
}
