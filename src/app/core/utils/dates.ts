import { HE } from '../i18n/he'
import { todayInJerusalem } from './age'

/** Today as YYYY-MM-DD in Asia/Jerusalem. */
export function today(now: Date = new Date()): string {
  return todayInJerusalem(now)
}

function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The Sunday on or before the date. */
export function weekStart(iso: string): string {
  return addDays(iso, -parse(iso).getUTCDay())
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(iso: string, months: number): string {
  const d = parse(monthStart(iso))
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** 6 weeks (42 days) starting on the Sunday on or before the 1st of the month. */
export function monthGrid(iso: string): string[] {
  const start = weekStart(monthStart(iso))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

export function dayOfWeek(iso: string): number {
  return parse(iso).getUTCDay()
}

export function dayLetter(iso: string): string {
  return HE.calendar.dayLetters[dayOfWeek(iso)]
}

function monthName(iso: string): string {
  return HE.calendar.months[Number(iso.slice(5, 7)) - 1]
}

/** `15–21 בנובמבר 2026`, or both month names when the week crosses months. */
export function weekTitle(start: string): string {
  const end = addDays(start, 6)
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${dayOfMonth(start)}–${dayOfMonth(end)} ${HE.calendar.inMonth}${monthName(start)} ${start.slice(0, 4)}`
  }
  const startYear = start.slice(0, 4) === end.slice(0, 4) ? '' : ` ${start.slice(0, 4)}`
  return `${dayOfMonth(start)} ${HE.calendar.inMonth}${monthName(start)}${startYear} – ${dayOfMonth(end)} ${HE.calendar.inMonth}${monthName(end)} ${end.slice(0, 4)}`
}

/** `15 בנובמבר` */
export function shortDate(iso: string): string {
  return `${dayOfMonth(iso)} ${HE.calendar.inMonth}${monthName(iso)}`
}

/** `נובמבר 2026` */
export function monthTitle(iso: string): string {
  return `${monthName(iso)} ${iso.slice(0, 4)}`
}

/** `יום ג׳, 17 בנובמבר` */
export function dayTitle(iso: string): string {
  return `${HE.calendar.dayWord} ${dayLetter(iso)}, ${dayOfMonth(iso)} ${HE.calendar.inMonth}${monthName(iso)}`
}
