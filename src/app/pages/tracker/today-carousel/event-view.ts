import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { sleepCycle, sleepMinutes } from '../../../core/utils/tracker-rules'

const t = HE.tracker.log

export interface EventView {
  emoji: string
  title: string
  details: string
  /** Suffix of the CSS class that picks the event colour token. */
  tone: string
  pulse: boolean
}

/** The glyph of an event type for the carousel peeks. */
export function peekGlyph(event: TrackerEvent): string {
  switch (event.eventType) {
    case 'NUTRITION':
      return '🍼'
    case 'DIAPER':
      return '🧷'
    case 'SLEEP':
      return '💤'
    case 'ACTIVITY':
      return '🎨'
    case 'WEIGHT':
      return '⚖️'
    case 'PUMPING':
      return '🥛'
    case 'VOMITING':
      return '🤢'
    default:
      return '•'
  }
}

/** Title, details, glyph and colour of an event as the today carousel shows it (spec §4.1). */
export function describeEvent(event: TrackerEvent, now: number): EventView {
  const view = base(event, now)
  if (event.quickRecorded) {
    if (event.eventType === 'NUTRITION') {
      const breast = event.nutrition?.feedType === 'BREAST'
      return { ...view, title: breast ? t.quickBreast : t.quickMeal, details: '' }
    }
    if (event.eventType === 'DIAPER' && event.diaper) {
      return {
        ...view,
        title: t.quickDiaperTitle.replace('{what}', t.diaperWhat[event.diaper.contains]),
        details: '',
      }
    }
    if (event.eventType === 'SLEEP')
      return { emoji: '💤', title: t.quickSleepTitle, details: '', tone: 'sleep', pulse: false }
  }
  return view
}

function base(event: TrackerEvent, now: number): EventView {
  switch (event.eventType) {
    case 'NUTRITION': {
      const n = event.nutrition
      if (n?.feedType === 'BREAST') {
        return {
          emoji: '🤱',
          title: t.breastTitle,
          details: t.breastDetails
            .replace('{side}', t.sides[n.breastSide ?? 'BOTH'])
            .replace('{min}', String(n.durationMinutes ?? 0)),
          tone: 'breast',
          pulse: false,
        }
      }
      const spit =
        n?.spitUp === 'LIGHT' ? t.spitLight : n?.spitUp === 'HEAVY_VOMIT' ? t.spitHeavy : ''
      return {
        emoji: '🍼',
        title: n?.bottleLiquidType === 'FORMULA' ? t.bottleTitleFormula : t.bottleTitleExpressed,
        details:
          t.bottleDetails
            .replace('{c}', String(n?.amountConsumedMl ?? 0))
            .replace('{o}', String(n?.amountOfferedMl ?? 0)) + spit,
        tone: 'nutrition',
        pulse: false,
      }
    }
    case 'DIAPER': {
      const d = event.diaper
      const parts: string[] = []
      if (d && d.contains !== 'POO' && d.peeVolume)
        parts.push(d.peeVolume === 'HEAVY_SOAKED' ? t.peeHeavy : t.peeLight)
      if (d && d.contains !== 'PEE') {
        if (d.pooAmount) parts.push(t.pooAmount[d.pooAmount])
        if (d.pooColor) parts.push(t.pooColor[d.pooColor])
      }
      return {
        emoji: '🧷',
        title: t.diaperTitle.replace('{what}', d ? t.diaperWhat[d.contains] : ''),
        details: parts.join(' • '),
        tone: 'diaper',
        pulse: false,
      }
    }
    case 'SLEEP': {
      const s = event.sleep
      const running = s?.endAt === null
      const minutes = s ? sleepMinutes(event, now) : 0
      const cycle = sleepCycle(s?.durationMinutes, running)
      const loc = s?.startLocation
        ? t.sleepLocation.replace('{loc}', t.locations[s.startLocation])
        : ''
      const duration =
        running || !minutes
          ? t.sleepNow
          : t.sleepDuration
              .replace('{h}', String(Math.floor(minutes / 60)))
              .replace('{m}', String(minutes % 60))
      const common = { details: loc + duration }
      if (cycle === 'running')
        return { ...common, emoji: '💤', title: t.sleepActive, tone: 'sleep', pulse: true }
      if (cycle === 'bad')
        return { ...common, emoji: '❌', title: t.cycleBad, tone: 'sleep-bad', pulse: false }
      if (cycle === 'good')
        return { ...common, emoji: '👍', title: t.cycleGood, tone: 'sleep-good', pulse: false }
      return { ...common, emoji: '🌟', title: t.cycleGreat, tone: 'sleep-great', pulse: false }
    }
    case 'ACTIVITY': {
      const a = event.activity
      return {
        emoji: '🎨',
        title: t.activityTitle.replace('{name}', a?.activityName ?? ''),
        details: a?.cryingIntensity
          ? t.activityIntensity.replace('{n}', String(a.cryingIntensity))
          : t.activityCalm,
        tone: 'activity',
        pulse: false,
      }
    }
    case 'WEIGHT': {
      const w = event.weight
      const g = w?.weightGrams ?? 0
      return {
        emoji: '⚖️',
        title: t.weightTitle,
        details:
          t.weightDetails.replace('{kg}', (g / 1000).toFixed(3)).replace('{g}', String(g)) +
          (w?.percentile !== undefined
            ? t.weightPercentile.replace('{p}', String(w.percentile))
            : ''),
        tone: 'weight',
        pulse: false,
      }
    }
    case 'PUMPING': {
      const p = event.pumping
      const l = p?.leftAmountMl ?? 0
      const r = p?.rightAmountMl ?? 0
      return {
        emoji: '🍼🤱',
        title: t.pumpingTitle,
        details: t.pumpingDetails
          .replace('{l}', String(l))
          .replace('{r}', String(r))
          .replace('{t}', String(l + r)),
        tone: 'pumping',
        pulse: false,
      }
    }
    case 'VOMITING':
      return {
        emoji: '🤮',
        title: t.vomitingTitle,
        details: event.vomiting ? t.vomitingSizes[event.vomiting.size] : '',
        tone: 'vomiting',
        pulse: false,
      }
    default:
      return {
        emoji: '💧',
        title: event.supplement?.name ?? t.supplementTitle,
        details: '',
        tone: 'supplement',
        pulse: false,
      }
  }
}
