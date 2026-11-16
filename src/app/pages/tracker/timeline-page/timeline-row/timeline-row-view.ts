import { HE } from '../../../../core/i18n/he'
import { TrackerEvent } from '../../../../core/models/tracker-event'
import { ParentType } from '../../../../core/models/user'
import { israelClock, israelDateKey, israelHour } from '../../../../core/utils/israel-time'

const t = HE.tracker.timeline

export interface RowContext {
  /** Every loaded event, newest first (big-nap and tier rules look across all of them). */
  events: readonly TrackerEvent[]
  parentName: (parent: ParentType) => string
}

export interface RowView {
  icon: string
  title: string
  details: string
  /** CSS class suffix that picks the event colour token. */
  tone: string
  /** Set when a quality tier replaces the event colour on the start edge. */
  tier: 'bad' | 'okay' | 'good' | 'great' | null
  time: string
  bigNap: boolean
  memo: boolean
  note: string
  topUp: string
  attribution: string
  quick: boolean
}

type Tier = NonNullable<RowView['tier']>

const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

/** `{h}ש {m}ד` of a minute count; "לא הוגדר" when it is 0 or missing. */
export function durationText(minutes: number | undefined): string {
  if (!minutes) return t.durationUnset
  return fill(t.duration, { h: Math.floor(minutes / 60), m: minutes % 60 })
}

/** The sleep icon, title and tone from its length; a running sleep (or one with no length) reads as active. */
export function sleepFace(event: TrackerEvent): { icon: string; title: string; tone: string } {
  const sleep = event.sleep
  const d = sleep?.durationMinutes
  if (!sleep || sleep.endAt === null || d === undefined)
    return { icon: '💤', title: t.cycleActive, tone: 'sleep' }
  if (d < 30) return { icon: '❌', title: t.cycleBad, tone: 'sleep-bad' }
  if (d < 45) return { icon: '👍', title: t.cycleGood, tone: 'sleep' }
  return { icon: '🌟', title: t.cycleGreat, tone: 'sleep-great' }
}

function previousWeight(event: TrackerEvent, events: readonly TrackerEvent[]): TrackerEvent | null {
  const at = Date.parse(event.timestamp)
  let best: TrackerEvent | null = null
  for (const e of events) {
    if (e.eventType !== 'WEIGHT' || e.id === event.id || !e.weight) continue
    const ts = Date.parse(e.timestamp)
    if (ts >= at) continue
    if (!best || ts > Date.parse(best.timestamp)) best = e
  }
  return best
}

/** The quality tier of an event that shows one (bottle with an offer, timed breast feed, weight with a previous one). */
export function eventTier(event: TrackerEvent, events: readonly TrackerEvent[]): Tier | null {
  const n = event.nutrition
  if (event.eventType === 'NUTRITION' && n) {
    if (n.feedType === 'BREAST') {
      const m = n.durationMinutes ?? 0
      if (m <= 0) return null
      return m < 5 ? 'bad' : m <= 15 ? 'good' : 'great'
    }
    const offered = n.amountOfferedMl ?? 0
    if (offered <= 0) return null
    const pct = ((n.amountConsumedMl ?? 0) / offered) * 100
    return pct < 50 ? 'bad' : pct < 80 ? 'okay' : pct < 100 ? 'good' : 'great'
  }
  if (event.eventType === 'WEIGHT' && event.weight) {
    const prev = previousWeight(event, events)
    if (!prev?.weight) return null
    const now = event.weight.weightGrams
    const before = prev.weight.weightGrams
    return now < before ? 'bad' : now > before ? 'good' : 'okay'
  }
  return null
}

/** True for the earliest 12:00-15:59 sleep of its day that ran 75+ minutes (across all loaded events). */
export function isBigNap(event: TrackerEvent, events: readonly TrackerEvent[]): boolean {
  const qualifies = (e: TrackerEvent): number | null => {
    const s = e.sleep
    if (e.eventType !== 'SLEEP' || !s || s.endAt === null || !s.durationMinutes) return null
    const start = Date.parse(s.startAt ?? e.timestamp)
    const h = israelHour(start)
    return h >= 12 && h < 16 && s.durationMinutes >= 75 ? start : null
  }
  const mine = qualifies(event)
  if (mine === null) return false
  const day = israelDateKey(mine)
  for (const e of events) {
    const other = qualifies(e)
    if (other !== null && israelDateKey(other) === day && other < mine) return false
  }
  return true
}

function sleepAttribution(event: TrackerEvent, ctx: RowContext): string {
  const s = event.sleep
  const start = s?.startedBy ?? event.loggedBy
  const nameStart = ctx.parentName(start)
  if (s && s.endAt === null && s.startedBy) return fill(t.sleepStarting, { a: nameStart })
  if (s?.startedBy && s.endedBy && s.startedBy !== s.endedBy)
    return fill(t.sleepStartedEnded, { a: nameStart, b: ctx.parentName(s.endedBy) })
  return fill(t.loggedBy, { name: nameStart })
}

function body(
  event: TrackerEvent,
  ctx: RowContext,
): Pick<RowView, 'icon' | 'title' | 'details' | 'tone'> {
  switch (event.eventType) {
    case 'NUTRITION': {
      const n = event.nutrition
      let details = ''
      let result: Pick<RowView, 'icon' | 'title' | 'details' | 'tone'>
      if (n?.feedType === 'BOTTLE') {
        const hasAmounts = n.amountOfferedMl !== undefined || n.amountConsumedMl !== undefined
        if (hasAmounts) {
          details = fill(t.bottleDetails, { o: n.amountOfferedMl ?? 0, c: n.amountConsumedMl ?? 0 })
          if (n.spitUp === 'LIGHT') details += t.spitLight
          else if (n.spitUp && n.spitUp !== 'NONE') details += t.spitHeavy
        }
        result = {
          icon: '🍼',
          title: n.bottleLiquidType === 'EXPRESSED_MILK' ? t.bottleExpressed : t.bottleFormula,
          details,
          tone: 'nutrition',
        }
      } else if (n) {
        result = {
          icon: '🤱',
          title: t.breastTitle[n.breastSide ?? 'BOTH'],
          details: fill(t.breastDetails, { m: n.durationMinutes ?? 0 }),
          tone: 'breast',
        }
      } else {
        result = { icon: '🍼', title: '', details: '', tone: 'nutrition' }
      }
      if (n?.swallowingNoises) result.details += t.swallowing
      return result
    }
    case 'DIAPER': {
      const d = event.diaper
      const parts: string[] = []
      if (d && d.contains !== 'POO' && d.peeVolume)
        parts.push(d.peeVolume === 'LIGHT' ? t.peeLight : t.peeHeavy)
      if (d && d.contains !== 'PEE') {
        if (d.pooAmount) parts.push(t.pooAmount[d.pooAmount])
        if (d.pooColor) parts.push(t.pooColor[d.pooColor])
      }
      return {
        icon: '🧷',
        title: d ? t.diaperTitle[d.contains] : '',
        details: parts.join(' • '),
        tone: 'diaper',
      }
    }
    case 'SLEEP': {
      const s = event.sleep
      const face = sleepFace(event)
      let details = fill(t.sleepDetails, {
        d: durationText(s?.durationMinutes),
        s: israelClock(Date.parse(s?.startAt ?? event.timestamp)),
      })
      details += s?.endAt
        ? fill(t.sleepUntil, { e: israelClock(Date.parse(s.endAt)) })
        : t.sleepStillAsleep
      return { ...face, details }
    }
    case 'ACTIVITY': {
      const a = event.activity
      return {
        icon: '🎨',
        title: fill(t.activityTitle, { name: a?.activityName ?? '' }),
        details: a?.cryingIntensity
          ? fill(t.activityIntensity, { n: a.cryingIntensity })
          : t.activityCalm,
        tone: 'activity',
      }
    }
    case 'WEIGHT': {
      const w = event.weight
      const g = w?.weightGrams ?? 0
      let details = fill(t.weightDetails, { kg: (g / 1000).toFixed(3), g })
      if (w?.percentile) details += fill(t.weightPercentile, { p: w.percentile })
      return { icon: '⚖️', title: t.weightTitle, details, tone: 'weight' }
    }
    case 'PUMPING': {
      const p = event.pumping
      const l = p?.leftAmountMl ?? 0
      const r = p?.rightAmountMl ?? 0
      return {
        icon: '🍼🤱',
        title: t.pumpingTitle,
        details: fill(t.pumpingDetails, { l, r, t: l + r }),
        tone: 'pumping',
      }
    }
    case 'VOMITING':
      return {
        icon: '🤮',
        title: t.vomitingTitle,
        details: event.vomiting
          ? fill(t.vomitingDetails, { x: t.vomitingSizes[event.vomiting.size] })
          : '',
        tone: 'vomiting',
      }
    default:
      return {
        icon: '💧',
        title: event.supplement?.name ?? '',
        details: fill(t.supplementDetails, { name: ctx.parentName(event.loggedBy) }),
        tone: 'supplement',
      }
  }
}

/** Everything one timeline row shows (spec-timeline-dashboards §2.5-§2.7). */
export function describeRow(event: TrackerEvent, ctx: RowContext): RowView {
  const view = body(event, ctx)
  const note = event.note ?? ''
  const topUp = event.nutrition?.topUp
  return {
    ...view,
    tier: eventTier(event, ctx.events),
    time: israelClock(Date.parse(event.timestamp)),
    bigNap: isBigNap(event, ctx.events),
    memo: note.trim() !== '',
    note,
    topUp:
      event.eventType === 'NUTRITION' && event.nutrition?.feedType === 'BREAST' && topUp
        ? fill(t.topUp, { n: topUp.consumedMl })
        : '',
    attribution:
      event.eventType === 'SLEEP'
        ? sleepAttribution(event, ctx)
        : fill(t.loggedBy, { name: ctx.parentName(event.loggedBy) }),
    quick: !!event.quickRecorded,
  }
}
