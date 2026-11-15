// Pure string math on YYYY-MM-DD dates (UTC arithmetic, no clock).
function parse(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

export function isRealDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parse(s)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function isoAddDays(iso, days) {
  const d = parse(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function isoDiffDays(from, to) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000)
}

export function weekStartSunday(iso) {
  return isoAddDays(iso, -parse(iso).getUTCDay())
}
