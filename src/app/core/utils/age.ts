export interface AgeParts {
  months: number
  days: number
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m, d]
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Whole calendar months and total days between a birth date and today (both YYYY-MM-DD). Never negative. */
export function ageParts(birthDate: string, todayIso: string): AgeParts {
  const [by, bm, bd] = parts(birthDate)
  const [ty, tm, td] = parts(todayIso)
  let months = (ty - by) * 12 + (tm - bm)
  const monthEnd = td === daysInMonth(ty, tm) && bd > td
  if (td < bd && !monthEnd) months -= 1
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
  return { months: Math.max(0, months), days: Math.max(0, days) }
}

/** Today's date as YYYY-MM-DD in Asia/Jerusalem. */
export function todayInJerusalem(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
