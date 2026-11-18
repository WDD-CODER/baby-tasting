import { FOOD_CATEGORIES } from '../seed/catalog.js'
import { HttpError } from './http-error.js'

function invalid(message) {
  return new HttpError(400, 'invalid', message)
}

export function parseName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name.length < 1 || name.length > 40) throw invalid('Name must be 1-40 characters')
  return name
}

function parseEmoji(value) {
  const emoji = typeof value === 'string' ? value.trim() : ''
  // '' = no icon (D-017-4)
  if ([...emoji].length > 8) throw invalid('Emoji must be at most 8 characters')
  return emoji
}

function parseCategory(value) {
  if (!FOOD_CATEGORIES.includes(value)) throw invalid('Unknown category')
  return value
}

function parseWarning(value) {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw invalid('Invalid warning')
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (text.length > 120) throw invalid('Warning text is longer than 120 characters')
  const untilMonths = value.untilMonths ?? null
  if (untilMonths !== null && (!Number.isInteger(untilMonths) || untilMonths < 1 || untilMonths > 120)) {
    throw invalid('Warning age must be a whole number of months, 1-120')
  }
  // an empty text means no warning at all
  return text ? { text, untilMonths } : null
}

// Returns the validated fields that are present (a PATCH sends only some); `full` requires name, emoji, category.
export function parseFoodInput(body, { full }) {
  const input = body && typeof body === 'object' ? body : {}
  const out = {}
  if (full || 'name' in input) out.name = parseName(input.name)
  if (full || 'emoji' in input) out.emoji = parseEmoji(input.emoji)
  if (full || 'category' in input) out.category = parseCategory(input.category)
  if ('allergenId' in input) {
    if (input.allergenId !== null && typeof input.allergenId !== 'string') throw invalid('Invalid allergen')
    out.allergenId = input.allergenId
  }
  if ('warning' in input) out.warning = parseWarning(input.warning)
  return out
}
