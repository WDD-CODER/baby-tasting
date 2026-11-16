// The rows of the Excel report, one list per sheet (spec-server-data §5.3-5.9). Pure: no workbook, no I/O.
import { jerusalemParts } from './baby-day.js'
import { datesInRange } from './stats.js'

const pad = (n) => String(n).padStart(2, '0')

// Israel calendar date (YYYY-MM-DD) and 24h time (HH:MM) of an ISO moment.
export function israelDate(iso) {
  const p = jerusalemParts(Date.parse(iso))
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}
export function israelTime(iso) {
  const p = jerusalemParts(Date.parse(iso))
  return `${pad(p.hour)}:${pad(p.minute)}`
}

const SPIT_UP = { LIGHT: 'פליטה קלה', HEAVY_VOMIT: 'הקאה' }
const SIDE = { LEFT: 'שמאל', RIGHT: 'ימין', BOTH: 'שני הצדדים' }
const LOCATION = { CRIB: 'מיטה / עריסה', HANDS: 'על הידיים', CARRIER: 'מנשא' }
const CONTAINS = { PEE: 'שתן', POO: 'צואה' }
const PEE_VOLUME = { LIGHT: 'קל', HEAVY_SOAKED: 'רטוב כבד' }
const POO_AMOUNT = { SMALL: 'קטן', MEDIUM: 'בינוני', LARGE_OVERFLOW: 'גדול מאוד / גלישה' }
const POO_COLOR = { YELLOW_MUSTARD: 'צהוב חרדל', GREEN: 'ירוק', BROWN: 'חום' }
const POO_TEXTURE = { LIQUID: 'נוזלי', SEEDY: 'גרגרי', PASTY: 'משחתי', HARD: 'קשה' }
const VOMIT_SIZE = { SMALL: 'קטנה', MEDIUM: 'בינונית' }

const col = (header, key, width) => ({ header, key, width })
const blank = (n) => (n ? n : '')

export const SHEET_NAMES = Object.freeze({
  summary: 'Summary - סיכום יומי',
  feeds: 'Feeds - האכלות',
  sleep: 'Sleep - שינה',
  diapers: 'Diapers - חיתולים',
  weight: 'Weight - משקל',
  pumping: 'Pumping - שאיבות',
  vomiting: 'Vomiting - פליטות',
})

const SUMMARY_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('הוצע מ״ל / Offered (ml)', 'offered', 22),
  col('נצרך מ״ל / Consumed (ml)', 'consumed', 22),
  col('הפרש מ״ל / Delta (ml)', 'delta', 18),
  col('אחוז צריכה / Consumed %', 'consumedPct', 22),
  col('מספר האכלות / Feeds Count', 'feeds', 22),
  col('סה״כ שינה / Total Sleep', 'sleep', 24),
  col('חיתולי שתן / Pee Diapers', 'pee', 22),
  col('חיתולי צואה / Poo Diapers', 'poo', 22),
  col('משקל אחרון (גרם) / Latest Weight', 'weight', 26),
]

const FEEDS_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעה / Time', 'time', 12),
  col('סוג האכלה / Type', 'type', 18),
  col('כמות שהוצעה (מ״ל) / Offered', 'offered', 22),
  col('כמות שנצרכה (מ״ל) / Consumed', 'consumed', 22),
  col('החזרה / Spit Up', 'spitUp', 18),
  col('צד הנקה / Breast Side', 'breastSide', 18),
  col('משך (דקות) / Duration (m)', 'duration', 18),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

const SLEEP_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעת תחילת שינה / Start Time', 'start', 20),
  col('שעת סיום שינה / End Time', 'end', 20),
  col('משך (דקות) / Duration (m)', 'duration', 18),
  col('משך (שעות) / Duration (h)', 'durationHours', 18),
  col('מיקום שינה / Location', 'location', 18),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

const DIAPERS_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעה / Time', 'time', 12),
  col('תכולה / Contains', 'contains', 18),
  col('רטיבות שתן / Pee Volume', 'pee', 18),
  col('כמות צואה / Poo Amount', 'pooAmount', 18),
  col('צבע צואה / Poo Color', 'pooColor', 20),
  col('מרקם צואה / Poo Texture', 'pooTexture', 18),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

const WEIGHT_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעה / Time', 'time', 12),
  col('משקל (גרם) / Weight (g)', 'weight', 22),
  col('משקל (ק״ג) / Weight (kg)', 'weightKg', 22),
  col('אחוזון / Percentile', 'percentile', 18),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

const PUMPING_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעה / Time', 'time', 12),
  col('שמאל (מ״ל) / Left (ml)', 'left', 20),
  col('ימין (מ״ל) / Right (ml)', 'right', 20),
  col('סה״ך (מ״ל) / Total (ml)', 'total', 20),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

const VOMITING_COLUMNS = [
  col('תאריך / Date', 'date', 15),
  col('שעה / Time', 'time', 12),
  col('גודל פליטה / Spit Up Size', 'size', 22),
  col('נרשם על ידי / Logged By', 'loggedBy', 18),
  col('הערה / Notes', 'notes', 30),
]

function summaryRows(events, from, to) {
  const days = new Map(
    datesInRange(from, to).map((date) => [
      date,
      { date, offered: 0, consumed: 0, feeds: 0, sleepMin: 0, pee: 0, poo: 0, weight: 0, weightAt: '' },
    ]),
  )
  for (const e of events) {
    const day = days.get(israelDate(e.timestamp))
    if (!day) continue
    if (e.eventType === 'NUTRITION' && e.nutrition) {
      day.feeds += 1
      if (e.nutrition.feedType === 'BOTTLE') {
        day.offered += e.nutrition.amountOfferedMl || 0
        day.consumed += e.nutrition.amountConsumedMl || 0
      }
    } else if (e.eventType === 'SLEEP' && e.sleep) {
      day.sleepMin += e.sleep.durationMinutes || 0
    } else if (e.eventType === 'DIAPER' && e.diaper) {
      if (e.diaper.contains === 'PEE' || e.diaper.contains === 'BOTH') day.pee += 1
      if (e.diaper.contains === 'POO' || e.diaper.contains === 'BOTH') day.poo += 1
    } else if (e.eventType === 'WEIGHT' && e.weight) {
      // F11: the column is the day's LATEST weigh-in (the old app kept the earliest by mistake).
      if (e.timestamp >= day.weightAt) {
        day.weightAt = e.timestamp
        day.weight = e.weight.weightGrams
      }
    }
  }
  return [...days.values()]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((d) => ({
      date: d.date,
      offered: blank(d.offered),
      consumed: blank(d.consumed),
      delta: d.offered > 0 ? Math.max(0, d.offered - d.consumed) : '',
      consumedPct: d.offered > 0 ? `${Math.round((d.consumed / d.offered) * 100)}%` : '',
      feeds: blank(d.feeds),
      sleep: d.sleepMin > 0 ? `${Math.floor(d.sleepMin / 60)}ש ${d.sleepMin % 60}ד` : '0',
      pee: blank(d.pee),
      poo: blank(d.poo),
      weight: blank(d.weight),
    }))
}

// events: API-shaped events (toApiEvent) in the range, newest first. names: { parentAName, parentBName }.
// from / to: YYYY-MM-DD (Israel days). Returns the 7 sheets in order.
export function buildExportSheets({ events, from, to, names }) {
  const who = (e) => (e.loggedBy === 'PARENT_A' ? names.parentAName || 'אמא' : names.parentBName || 'אבא')
  const common = (e) => ({
    date: israelDate(e.timestamp),
    time: israelTime(e.timestamp),
    loggedBy: who(e),
    notes: e.note || '',
  })
  const of = (type, key) => events.filter((e) => e.eventType === type && e[key])

  const feeds = of('NUTRITION', 'nutrition').map((e) => {
    const n = e.nutrition
    return {
      ...common(e),
      type: n.feedType === 'BOTTLE' ? (n.bottleLiquidType === 'EXPRESSED_MILK' ? 'חלב שאוב' : 'תמ״ל (פורמולה)') : 'הנקה',
      offered: n.amountOfferedMl || '',
      consumed: n.amountConsumedMl || '',
      spitUp: SPIT_UP[n.spitUp] ?? 'אין',
      breastSide: SIDE[n.breastSide] ?? '',
      duration: n.durationMinutes || '',
    }
  })

  const sleeps = of('SLEEP', 'sleep').map((e) => {
    const s = e.sleep
    let hours = ''
    if (s.durationMinutes) hours = parseFloat((s.durationMinutes / 60).toFixed(1))
    else if (s.endAt === null) hours = 'ישן כעת'
    return {
      ...common(e),
      date: israelDate(s.startAt),
      start: israelTime(s.startAt),
      end: s.endAt ? israelTime(s.endAt) : 'ישן כעת',
      duration: s.durationMinutes || '',
      durationHours: hours,
      location: s.startLocation ? (LOCATION[s.startLocation] ?? 'עגלה') : '',
    }
  })

  const diapers = of('DIAPER', 'diaper').map((e) => ({
    ...common(e),
    contains: CONTAINS[e.diaper.contains] ?? 'שתן + צואה',
    pee: PEE_VOLUME[e.diaper.peeVolume] ?? '',
    pooAmount: POO_AMOUNT[e.diaper.pooAmount] ?? '',
    pooColor: POO_COLOR[e.diaper.pooColor] ?? '',
    pooTexture: POO_TEXTURE[e.diaper.pooTexture] ?? '',
  }))

  const weights = of('WEIGHT', 'weight').map((e) => ({
    ...common(e),
    weight: e.weight.weightGrams,
    weightKg: (e.weight.weightGrams / 1000).toFixed(3),
    percentile: e.weight.percentile || '',
  }))

  const pumpings = of('PUMPING', 'pumping').map((e) => ({
    ...common(e),
    left: e.pumping.leftAmountMl,
    right: e.pumping.rightAmountMl,
    total: (e.pumping.leftAmountMl || 0) + (e.pumping.rightAmountMl || 0),
  }))

  const vomits = of('VOMITING', 'vomiting').map((e) => ({
    ...common(e),
    size: VOMIT_SIZE[e.vomiting.size] ?? 'גדולה',
  }))

  return [
    { name: SHEET_NAMES.summary, columns: SUMMARY_COLUMNS, rows: summaryRows(events, from, to) },
    { name: SHEET_NAMES.feeds, columns: FEEDS_COLUMNS, rows: feeds },
    { name: SHEET_NAMES.sleep, columns: SLEEP_COLUMNS, rows: sleeps },
    { name: SHEET_NAMES.diapers, columns: DIAPERS_COLUMNS, rows: diapers },
    { name: SHEET_NAMES.weight, columns: WEIGHT_COLUMNS, rows: weights },
    { name: SHEET_NAMES.pumping, columns: PUMPING_COLUMNS, rows: pumpings },
    { name: SHEET_NAMES.vomiting, columns: VOMITING_COLUMNS, rows: vomits },
  ]
}
