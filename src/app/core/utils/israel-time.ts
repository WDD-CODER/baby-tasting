// Wall-clock helpers in Asia/Jerusalem (program P4). A "wall-clock string" is `YYYY-MM-DDTHH:mm`.

const TZ = 'Asia/Jerusalem'
const DAY_START_HOUR = 6

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export interface WallParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** The Jerusalem wall-clock parts of an instant. */
export function israelParts(ms: number): WallParts {
  const p: Record<string, number> = {}
  for (const part of fmt.formatToParts(new Date(ms))) p[part.type] = Number(part.value)
  return {
    year: p['year'],
    month: p['month'],
    day: p['day'],
    hour: p['hour'],
    minute: p['minute'],
    second: p['second'],
  }
}

function offsetMs(ms: number): number {
  const p = israelParts(ms)
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
  )
}

/** `YYYY-MM-DDTHH:mm` in Jerusalem for an instant. */
export function toIsraelString(ms: number): string {
  const p = israelParts(ms)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

export function nowInIsrael(now: number = Date.now()): string {
  return toIsraelString(now)
}

/** The UTC instant (ms) of a Jerusalem wall-clock time. */
export function israelWallToMs(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  let guess = wall - offsetMs(wall)
  guess = wall - offsetMs(guess)
  return guess
}

/** Parses `YYYY-MM-DDTHH:mm` as Jerusalem time into an ISO instant; null when it is not a full value. */
export function israelToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(israelWallToMs(+m[1], +m[2], +m[3], +m[4], +m[5])).toISOString()
}

/** Moves a wall-clock string by minutes on the wall clock itself, rolling hours and days. */
export function addWallMinutes(value: string, minutes: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return value
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + minutes * 60000
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/**
 * A time-only value (D-015-1): the latest moment with the value's HH:mm that is not after `now` — today, or yesterday
 * when today's would be in the future. Returns `YYYY-MM-DDTHH:mm`; the value as given when it has no time.
 */
export function latestPastWall(value: string, now: number = Date.now()): string {
  const time = /T(\d{2}:\d{2})$/.exec(value)?.[1]
  if (!time) return value
  const today = nowInIsrael(now)
  const candidate = `${today.slice(0, 10)}T${time}`
  return candidate > today ? addWallMinutes(candidate, -1440) : candidate
}

export function israelHour(ms: number): number {
  return israelParts(ms).hour
}

/** `YYYY-MM-DD` of an instant in Jerusalem. */
export function israelDateKey(ms: number): string {
  const p = israelParts(ms)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** The start (ms) of the baby day (06:00 Jerusalem) that contains `now`. */
export function babyDayStartMs(now: number): number {
  const p = israelParts(now)
  const base = Date.UTC(p.year, p.month - 1, p.day)
  const day = new Date(p.hour < DAY_START_HOUR ? base - 86400000 : base)
  return israelWallToMs(
    day.getUTCFullYear(),
    day.getUTCMonth() + 1,
    day.getUTCDate(),
    DAY_START_HOUR,
  )
}

/** HH:mm (24 h) of an instant in Jerusalem. */
export function israelClock(ms: number): string {
  const p = israelParts(ms)
  return `${pad(p.hour)}:${pad(p.minute)}`
}
