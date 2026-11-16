import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { israelClock, israelParts } from '../../../core/utils/israel-time'

const t = HE.tracker.stats

export interface StatCard {
  event: TrackerEvent
  icon: string
  title: string
  details: string
  extra: string
  warn: string
  time: string
  tone: string
}

export interface DayGroup {
  /** `YYYY-MM-DD` baby day. */
  key: string
  label: string
  /** The group's own summary (pumping and vomiting day headers). */
  summary: string
  cards: StatCard[]
}

export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

const pad = (n: number): string => String(n).padStart(2, '0')

/** `YYYY-MM-DD` of the baby day (starts 06:00 Asia/Jerusalem) that holds an instant. */
export function babyDayKey(ms: number): string {
  const p = israelParts(ms)
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day - (p.hour < 6 ? 1 : 0)))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** `יום ב׳, 16.11` for a `YYYY-MM-DD` key. */
export function dayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'short', timeZone: 'UTC' }).format(d)
  const day = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  })
    .format(d)
    .replace('/', '.')
  return `${weekday.startsWith('יום') ? weekday : `יום ${weekday}`}, ${day}`
}

export function cardOf(e: TrackerEvent): StatCard {
  const time = israelClock(Date.parse(e.timestamp))
  const base = { event: e, time, extra: '', warn: '' }
  switch (e.eventType) {
    case 'NUTRITION': {
      const n = e.nutrition
      const warn =
        n?.spitUp === 'HEAVY_VOMIT'
          ? t.nutrition.spitHeavy
          : n?.spitUp === 'LIGHT'
            ? t.nutrition.spitLight
            : ''
      if (n?.feedType === 'BREAST') {
        return {
          ...base,
          warn,
          icon: '🤱',
          title: t.nutrition.breastTitle,
          details: fill(t.nutrition.side, {
            side: n.breastSide ? t.nutrition.sides[n.breastSide] : '',
            m: n.durationMinutes || 15,
          }),
          tone: 'breast',
        }
      }
      return {
        ...base,
        warn,
        icon: '🍼',
        title: n?.bottleLiquidType === 'FORMULA' ? t.nutrition.formula : t.nutrition.expressed,
        details: fill(t.nutrition.bottleDetails, {
          c: n?.amountConsumedMl || 0,
          o: n?.amountOfferedMl || 0,
        }),
        tone: 'nutrition',
      }
    }
    case 'DIAPER': {
      const d = e.diaper
      const contains = d?.contains ?? 'PEE'
      const parts: string[] = []
      if (contains !== 'POO' && d?.peeVolume) parts.push(t.diapers.peeVolume[d.peeVolume])
      if (contains !== 'PEE' && d?.pooAmount) parts.push(t.diapers.pooAmount[d.pooAmount])
      return {
        ...base,
        icon: contains === 'POO' ? '💩' : contains === 'BOTH' ? '💦💩' : '💦',
        title: t.diapers.titles[contains],
        details: parts.join(' • '),
        extra: contains !== 'PEE' && d?.pooColor ? t.diapers.pooColor[d.pooColor] : '',
        tone: 'diaper',
      }
    }
    case 'PUMPING': {
      const l = e.pumping?.leftAmountMl ?? 0
      const r = e.pumping?.rightAmountMl ?? 0
      return {
        ...base,
        icon: '🍼',
        title: t.pumping.cardTitle,
        details: fill(t.pumping.cardSides, { l, r }),
        extra: fill(t.pumping.cardTotal, { t: l + r }),
        tone: 'pumping',
      }
    }
    default: {
      const size = e.vomiting?.size ?? 'MEDIUM'
      return {
        ...base,
        icon: '🤮',
        title: t.vomiting.titles[size],
        details: e.note ?? '',
        tone: size === 'LARGE' ? 'vomiting' : 'plain',
      }
    }
  }
}

/** Newest day first; inside a day the cards go oldest first (vomiting: newest first). */
export function groupByDay(
  events: readonly TrackerEvent[],
  opts: { newestFirstInDay?: boolean; summary?: (cards: StatCard[]) => string } = {},
): DayGroup[] {
  const map = new Map<string, TrackerEvent[]>()
  for (const e of events) {
    const key = babyDayKey(Date.parse(e.timestamp))
    const list = map.get(key) ?? []
    list.push(e)
    map.set(key, list)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) =>
        opts.newestFirstInDay
          ? Date.parse(b.timestamp) - Date.parse(a.timestamp)
          : Date.parse(a.timestamp) - Date.parse(b.timestamp),
      )
      const cards = sorted.map(cardOf)
      return { key, label: dayLabel(key), summary: opts.summary ? opts.summary(cards) : '', cards }
    })
}
