// The "baby day" starts at 06:00 Asia/Jerusalem (program P4). Pure: Intl is used for the zone rules only.

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

// Wall-clock parts of a UTC instant in Jerusalem.
export function jerusalemParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]))
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second }
}

function offsetMs(ms) {
  const p = jerusalemParts(ms)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

// The UTC instant (ms) of a Jerusalem wall-clock time. Israel switches at 01:00/02:00, so 00:00 and 06:00 are unambiguous.
export function jerusalemToUtc(year, month, day, hour = 0) {
  const wall = Date.UTC(year, month - 1, day, hour)
  let guess = wall - offsetMs(wall)
  guess = wall - offsetMs(guess)
  return guess
}

// ISO start of the baby day that contains `nowIso`.
export function babyDayStart(nowIso) {
  const p = jerusalemParts(Date.parse(nowIso))
  const base = Date.UTC(p.year, p.month - 1, p.day)
  const day = new Date(p.hour < DAY_START_HOUR ? base - 86400000 : base)
  return new Date(
    jerusalemToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), DAY_START_HOUR),
  ).toISOString()
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDateString(s) {
  if (typeof s !== 'string') return false
  const m = DATE_RE.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

// ISO instant of 00:00 Jerusalem on a YYYY-MM-DD date, shifted by `plusDays` calendar days.
export function jerusalemMidnight(date, plusDays = 0) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(Date.UTC(y, m - 1, d + plusDays))
  return new Date(jerusalemToUtc(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), 0)).toISOString()
}
