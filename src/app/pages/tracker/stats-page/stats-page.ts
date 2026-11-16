import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { SleepLocation, TrackerEvent } from '../../../core/models/tracker-event'
import { EditSheetService } from '../../../core/services/edit-sheet.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { TrackerStatsService, shiftDay } from '../../../core/services/tracker-stats.service'
import {
  babyDayStartMs,
  israelClock,
  israelDateKey,
  israelWallToMs,
} from '../../../core/utils/israel-time'
import { BarChart, BarRow } from '../../../shared/ui/bar-chart/bar-chart'
import { SequenceBar, SequenceItem } from '../../../shared/ui/sequence-bar/sequence-bar'
import { SplitBar, SplitSegment } from '../../../shared/ui/split-bar/split-bar'
import { EditSheet } from '../edit-sheet/edit-sheet'
import { DayGroup, dayLabel, fill, groupByDay } from './stats-view'

const t = HE.tracker.stats
const SLEEP_TARGET_MINUTES = 960

export type SectionKey = 'nutrition' | 'sleep' | 'diapers' | 'pumping' | 'vomiting' | 'weight'

interface Tile {
  label: string
  value: string
}

interface SectionView {
  key: SectionKey
  title: string
  /** A CSS colour token for the section accent. */
  color: string
  summary: string
  tiles: Tile[]
  split: SplitSegment[]
  chips: string[]
  footerLabel: string
  footer: string
  cta: string
  note: string
}

const percentOf = (n: number, total: number): number =>
  total > 0 ? Math.round((n / total) * 100) : 0
const hm = (minutes: number): string =>
  fill(t.hoursMinutes, { h: Math.floor(minutes / 60), m: minutes % 60 })
const kg = (grams: number): string => fill(t.weight.kg, { n: (grams / 1000).toFixed(3) })

function segment(label: string, count: number, total: number, color: string): SplitSegment {
  const percent = percentOf(count, total)
  return { label: fill(label, { p: percent }), percent, color }
}

/** `/stats`: six collapsible sections of numbers the server computed for the chosen day range (spec-timeline-dashboards §3). */
@Component({
  selector: 'app-stats-page',
  imports: [SplitBar, BarChart, SequenceBar, EditSheet],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  private readonly events = inject(TrackerEventsService)
  private readonly stats = inject(TrackerStatsService)
  private readonly editSheet = inject(EditSheetService)

  protected readonly t = t
  protected readonly ranges = [1, 3, 7, 14]
  /** Not stored: the page opens on "today". */
  protected readonly days = signal(1)
  protected readonly expanded = signal<Record<SectionKey, boolean>>({
    nutrition: false,
    sleep: false,
    diapers: false,
    pumping: false,
    vomiting: false,
    weight: false,
  })
  protected readonly loaded = computed(() => this.stats.loaded() && this.events.loaded())

  /** Events of the range, newest first (the cards and the "latest" footers come from the loaded events). */
  private readonly rangeEvents = computed(() => {
    const to = israelDateKey(babyDayStartMs(this.events.now()))
    const from = shiftDay(to, -(this.days() - 1))
    const [y, m, d] = from.split('-').map(Number)
    const start = israelWallToMs(y, m, d, 6)
    return this.events.events().filter((e) => Date.parse(e.timestamp) >= start)
  })

  private latest(type: TrackerEvent['eventType']): TrackerEvent | undefined {
    return this.events.events().find((e) => e.eventType === type)
  }

  private nutritionSection(): SectionView {
    const n = this.stats.nutrition()?.totals
    const total = n?.feedsCount ?? 0
    const last = this.latest('NUTRITION')
    const footer = last?.nutrition
      ? fill(
          last.nutrition.feedType === 'BREAST'
            ? t.nutrition.latestBreast
            : t.nutrition.latestBottle,
          {
            m: last.nutrition.durationMinutes || 15,
            ml: last.nutrition.amountConsumedMl || 0,
            t: israelClock(Date.parse(last.timestamp)),
          },
        )
      : ''
    return {
      key: 'nutrition',
      title: t.nutrition.title,
      color: 'var(--color-event-nutrition)',
      summary: fill(t.nutrition.summary, { b: n?.bottleCount ?? 0, r: n?.breastCount ?? 0 }),
      tiles: [
        { label: t.nutrition.bottleTotal, value: fill(t.ml, { n: n?.bottleMl ?? 0 }) },
        {
          label: t.nutrition.breastTotal,
          value: fill(t.nutrition.breastValue, {
            n: n?.breastCount ?? 0,
            m: n?.breastMinutes ?? 0,
          }),
        },
        {
          label: t.nutrition.avg,
          value: fill(t.nutrition.meals, { n: (n?.feedsPerDay ?? 0).toFixed(1) }),
        },
      ],
      split:
        total > 0
          ? [
              segment(
                t.nutrition.splitBreast,
                n?.breastCount ?? 0,
                total,
                'var(--color-event-breast)',
              ),
              segment(
                t.nutrition.splitBottle,
                n?.bottleCount ?? 0,
                total,
                'var(--color-event-nutrition)',
              ),
            ]
          : [],
      chips: [],
      note: '',
      footerLabel: t.latest,
      footer,
      cta: t.chartCta,
    }
  }

  private sleepSection(): SectionView {
    const s = this.stats.sleep()?.totals
    const open = this.events.openSleep()
    const lastSleep = this.events.events().find((e) => e.eventType === 'SLEEP' && e.sleep?.endAt)
    let footer = ''
    if (open?.sleep) {
      footer = fill(t.sleep.sleepingNow, { t: israelClock(Date.parse(open.sleep.startAt)) })
    } else if (lastSleep?.sleep?.endAt) {
      footer = fill(t.sleep.wokeAt, {
        t: israelClock(Date.parse(lastSleep.sleep.endAt)),
        m: lastSleep.sleep.durationMinutes || 0,
      })
    }
    const chips = (['CRIB', 'HANDS', 'CARRIER', 'STROLLER'] as SleepLocation[])
      .filter((l) => (s?.locations[l] ?? 0) > 0)
      .map((l) => `${t.sleep.location[l]} (${s?.locations[l]})`)
    const minutes = s?.totalMinutes ?? 0
    return {
      key: 'sleep',
      title: t.sleep.title,
      color: 'var(--color-event-sleep)',
      summary: fill(t.sleep.summary, {
        h: Math.floor(minutes / 60),
        m: minutes % 60,
        n: s?.sessionCount ?? 0,
      }),
      tiles: [
        { label: t.sleep.total, value: hm(minutes) },
        { label: t.sleep.avg, value: fill(t.sleep.hours, { n: (s?.hoursPerDay ?? 0).toFixed(1) }) },
        { label: t.sleep.naps, value: fill(t.times, { n: s?.sessionCount ?? 0 }) },
      ],
      split: [],
      chips,
      note: chips.length ? t.sleep.locations : '',
      footerLabel: t.status,
      footer,
      cta: t.sleep.cta,
    }
  }

  private diapersSection(): SectionView {
    const d = this.stats.diapers()?.totals
    const total = d?.total ?? 0
    const last = this.latest('DIAPER')
    return {
      key: 'diapers',
      title: t.diapers.title,
      color: 'var(--color-event-diaper)',
      summary: `💦 ${d?.pee ?? 0} | 💩 ${d?.poo ?? 0} | 💦💩 ${d?.both ?? 0}`,
      tiles: [
        { label: t.diapers.pee, value: String(d?.pee ?? 0) },
        { label: t.diapers.poo, value: String(d?.poo ?? 0) },
        { label: t.diapers.both, value: String(d?.both ?? 0) },
        { label: t.diapers.avg, value: (d?.perDay ?? 0).toFixed(1) },
      ],
      split:
        total > 0
          ? [
              segment(t.diapers.splitPee, d?.pee ?? 0, total, 'var(--color-event-diaper)'),
              segment(t.diapers.splitBoth, d?.both ?? 0, total, 'var(--color-event-pumping)'),
              segment(t.diapers.splitPoo, d?.poo ?? 0, total, 'var(--color-event-activity)'),
            ]
          : [],
      chips: [],
      note: '',
      footerLabel: t.latest,
      footer: last?.diaper
        ? fill(t.diapers.latest[last.diaper.contains], {
            t: israelClock(Date.parse(last.timestamp)),
          })
        : '',
      cta: t.chartCta,
    }
  }

  private pumpingSection(): SectionView {
    const p = this.stats.pumping()?.totals
    const total = p?.totalMl ?? 0
    const last = this.latest('PUMPING')
    return {
      key: 'pumping',
      title: t.pumping.title,
      color: 'var(--color-event-pumping)',
      summary: fill(t.pumping.summary, { n: p?.todayMl ?? 0 }),
      tiles: [
        { label: t.pumping.total, value: fill(t.ml, { n: total }) },
        { label: t.pumping.avg, value: fill(t.ml, { n: p?.avgMlPerDay ?? 0 }) },
        { label: t.pumping.count, value: fill(t.times, { n: p?.sessionCount ?? 0 }) },
      ],
      split:
        total > 0
          ? [
              {
                label: fill(t.pumping.splitLeft, {
                  n: p?.leftMl ?? 0,
                  p: percentOf(p?.leftMl ?? 0, total),
                }),
                percent: percentOf(p?.leftMl ?? 0, total),
                color: 'var(--color-event-pumping)',
              },
              {
                label: fill(t.pumping.splitRight, {
                  n: p?.rightMl ?? 0,
                  p: percentOf(p?.rightMl ?? 0, total),
                }),
                percent: percentOf(p?.rightMl ?? 0, total),
                color: 'var(--color-event-weight)',
              },
            ]
          : [],
      chips: [],
      note: '',
      footerLabel: t.latest,
      footer: last?.pumping
        ? fill(t.pumping.latest, {
            l: last.pumping.leftAmountMl,
            r: last.pumping.rightAmountMl,
            t: israelClock(Date.parse(last.timestamp)),
          })
        : '',
      cta: t.chartCta,
    }
  }

  private vomitingSection(): SectionView {
    const v = this.stats.vomiting()?.totals
    const total = v?.total ?? 0
    const last = this.latest('VOMITING')
    return {
      key: 'vomiting',
      title: t.vomiting.title,
      color: 'var(--color-event-vomiting)',
      summary: fill(t.vomiting.summary, { n: total }),
      tiles: [
        { label: t.vomiting.small, value: String(v?.small ?? 0) },
        { label: t.vomiting.medium, value: String(v?.medium ?? 0) },
        { label: t.vomiting.large, value: String(v?.large ?? 0) },
        { label: t.vomiting.avg, value: (v?.perDay ?? 0).toFixed(1) },
      ],
      split:
        total > 0
          ? [
              segment(t.vomiting.splitSmall, v?.small ?? 0, total, 'var(--color-event-vomiting)'),
              segment(t.vomiting.splitMedium, v?.medium ?? 0, total, 'var(--color-event-weight)'),
              segment(t.vomiting.splitLarge, v?.large ?? 0, total, 'var(--color-tier-bad)'),
            ]
          : [],
      chips: [],
      note: '',
      footerLabel: t.latest,
      footer: last?.vomiting
        ? fill(t.vomiting.latest[last.vomiting.size], {
            t: israelClock(Date.parse(last.timestamp)),
          })
        : '',
      cta: t.vomiting.cta,
    }
  }

  private weightSection(): SectionView {
    const w = this.stats.weight()?.totals
    const change = w?.changeGrams ?? 0
    return {
      key: 'weight',
      title: t.weight.title,
      color: 'var(--color-event-weight)',
      summary: fill(t.weight.summary, { n: w?.count ?? 0 }),
      tiles: [
        {
          label: t.weight.latest,
          value: w?.latestGrams != null ? kg(w.latestGrams) : t.weight.none,
        },
        { label: t.weight.change, value: `${change >= 0 ? '+' : ''}${kg(change)}` },
      ],
      split: [],
      chips: [],
      note: w?.latestPercentile ? fill(t.weight.percentile, { p: w.latestPercentile }) : '',
      footerLabel: t.weight.dateLabel,
      footer: w?.latestDate ? dayLabel(w.latestDate) : '',
      cta: t.weight.cta,
    }
  }

  protected readonly sections = computed<SectionView[]>(() => [
    this.nutritionSection(),
    this.sleepSection(),
    this.diapersSection(),
    this.pumpingSection(),
    this.vomitingSection(),
    this.weightSection(),
  ])

  protected readonly groups = computed<
    Record<'nutrition' | 'diapers' | 'pumping' | 'vomiting', DayGroup[]>
  >(() => {
    const all = this.rangeEvents()
    const of = (type: TrackerEvent['eventType']): TrackerEvent[] =>
      all.filter((e) => e.eventType === type)
    return {
      nutrition: groupByDay(of('NUTRITION')),
      diapers: groupByDay(of('DIAPER')),
      pumping: groupByDay(of('PUMPING'), {
        summary: (cards) => {
          let l = 0
          let r = 0
          for (const c of cards) {
            l += c.event.pumping?.leftAmountMl ?? 0
            r += c.event.pumping?.rightAmountMl ?? 0
          }
          return fill(t.pumping.dayTotal, { t: l + r, l, r })
        },
      }),
      vomiting: groupByDay(of('VOMITING'), {
        newestFirstInDay: true,
        summary: (cards) => fill(t.vomiting.dayCount, { n: cards.length }),
      }),
    }
  })

  protected readonly sleepRows = computed<BarRow[]>(() =>
    (this.stats.sleep()?.days ?? []).map((d) => ({
      label: d.date,
      value: d.totalMinutes,
      caption: fill(t.sleep.barLabel, { h: (d.totalMinutes / 60).toFixed(1), n: d.sessionCount }),
    })),
  )
  protected readonly sleepTarget = SLEEP_TARGET_MINUTES
  protected readonly hasSleep = computed(() => (this.stats.sleep()?.totals.sessionCount ?? 0) > 0)

  /** Per day (newest first): sleeps in start order with the awake window between two sleeps of the same day. */
  protected readonly sleepSequence = computed(() =>
    [...(this.stats.sleep()?.days ?? [])]
      .filter((d) => d.sessions.length > 0)
      .reverse()
      .map((d) => {
        const items: SequenceItem[] = []
        d.sessions.forEach((s, i) => {
          const start = Date.parse(s.startAt)
          const end = s.endAt ? Date.parse(s.endAt) : null
          items.push({
            kind: 'sleep',
            id: s.id,
            icon: s.durationMinutes < 30 ? '❌' : s.durationMinutes < 45 ? '👍' : '🌟',
            title: fill(t.sleep.sleepItem, { m: s.durationMinutes }),
            detail: s.location
              ? fill(t.sleep.place, { loc: t.sleep.locationNamed[s.location] })
              : t.sleep.placeUnset,
            range:
              end === null
                ? fill(t.sleep.runningRange, { s: israelClock(start) })
                : `${israelClock(start)} - ${israelClock(end)}`,
          })
          const next = d.sessions[i + 1]
          if (next && end !== null) {
            const gap = Math.max(0, Math.floor((Date.parse(next.startAt) - end) / 60000))
            items.push({
              kind: 'awake',
              id: `gap-${s.id}`,
              icon: '🌱',
              title: t.sleep.awake,
              detail: '',
              range:
                gap >= 60
                  ? fill(t.sleep.awakeHours, { h: Math.floor(gap / 60), m: gap % 60 })
                  : fill(t.minutesShort, { n: gap }),
            })
          }
        })
        return { date: d.date, items }
      }),
  )

  protected readonly weightRows = computed(() =>
    (this.stats.weight()?.entries ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      kg: kg(e.weightGrams),
      percentile: e.percentile !== undefined ? fill(t.weight.percentile, { p: e.percentile }) : '',
    })),
  )

  constructor() {
    this.events.start()
    inject(DestroyRef).onDestroy(() => this.events.stop())
    // A new range is fetched at once.
    effect(() => {
      const days = this.days()
      untracked(() => void this.stats.load(days))
    })
    // After an edit or delete from a card the sheet closes: the numbers are fetched again.
    let wasOpen = false
    effect(() => {
      const open = this.editSheet.event() !== null
      if (wasOpen && !open) untracked(() => void this.stats.load(this.days()))
      wasOpen = open
    })
  }

  protected label(days: number): string {
    return days === 1 ? t.today : fill(t.days, { n: days })
  }

  /** The day groups of a card-list section; the sleep and weight sections have their own bodies. */
  protected groupsOf(key: SectionKey): DayGroup[] {
    const g = this.groups()
    return key === 'nutrition' || key === 'diapers' || key === 'pumping' || key === 'vomiting'
      ? g[key]
      : []
  }

  protected toggle(key: SectionKey): void {
    this.expanded.update((m) => ({ ...m, [key]: !m[key] }))
  }

  protected expand(key: SectionKey): void {
    this.expanded.update((m) => ({ ...m, [key]: true }))
  }

  protected edit(event: TrackerEvent): void {
    this.editSheet.open(event)
  }

  /** A tap on a sleep in the sequence opens it in the edit sheet. */
  protected editSleep(id: string): void {
    const event = this.events.events().find((e) => e.id === id)
    if (event) this.editSheet.open(event)
  }
}
