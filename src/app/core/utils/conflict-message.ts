import { HE } from '../i18n/he'
import { ConflictInfo } from '../models/api-error'
import { israelClock, israelParts } from './israel-time'

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}

function dayMonth(iso: string): string {
  const p = israelParts(Date.parse(iso))
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`
}

/**
 * The one Hebrew line that names what blocks a save (D-016-2), times in Asia/Jerusalem.
 * `candidate` is the event type being saved: a sleep or another type.
 */
export function conflictMessage(conflict: ConflictInfo, candidate: string): string {
  const t = HE.tracker.log
  const start = israelClock(Date.parse(conflict.startAt))
  const end = conflict.endAt ? israelClock(Date.parse(conflict.endAt)) : ''
  if (conflict.eventType === 'SLEEP') {
    if (candidate === 'SLEEP') {
      return conflict.endAt
        ? fill(t.conflictSleepOverSleep, { start, end, date: dayMonth(conflict.startAt) })
        : fill(t.conflictSleepOverOpen, { start })
    }
    return conflict.endAt
      ? fill(t.conflictAsleepThen, { start, end })
      : fill(t.conflictAsleepSince, { start })
  }
  const name = t.conflictEventName[conflict.eventType] ?? t.conflictEventName['NUTRITION']
  return fill(t.conflictSleepOverEvent, { name, start })
}

/** D-016-3: true when an awake-only event was refused by the open sleep (so the app asks to end it and log). */
export function isOpenSleepConflict(conflict: ConflictInfo, candidate: string): boolean {
  return conflict.eventType === 'SLEEP' && conflict.endAt === null && candidate !== 'SLEEP'
}
