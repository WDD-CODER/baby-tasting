import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TrackerEvent } from '../../../../core/models/tracker-event'
import { TrackerSettings } from '../../../../core/models/tracker-settings'
import { TrackerSettingsService } from '../../../../core/services/tracker-settings.service'
import { TimelineRow } from './timeline-row'
import { eventTier, isBigNap } from './timeline-row-view'

const settings: TrackerSettings = {
  parentAName: 'אמא',
  parentBName: 'אבא',
  defaultBottleType: 'EXPRESSED_MILK',
  customActivities: [],
  quickActionOrder: ['meal', 'diaper', 'sleep', 'activity', 'weight', 'vomiting'],
  iconOverrides: {},
}

const base = { loggedBy: 'PARENT_A' as const, timestamp: '2026-07-05T09:30:00.000Z' }

const CASES: { name: string; event: TrackerEvent; title: string; details: string }[] = [
  {
    name: 'bottle',
    event: {
      ...base,
      id: '1',
      eventType: 'NUTRITION',
      nutrition: {
        feedType: 'BOTTLE',
        bottleLiquidType: 'EXPRESSED_MILK',
        amountOfferedMl: 120,
        amountConsumedMl: 90,
        spitUp: 'LIGHT',
      },
    },
    title: 'חלב שאוב בבקבוק',
    details: 'הוצע: 120 מ״ל • נצרך: 90 מ״ל • פליטה קלה',
  },
  {
    name: 'breast',
    event: {
      ...base,
      id: '2',
      eventType: 'NUTRITION',
      nutrition: {
        feedType: 'BREAST',
        breastSide: 'LEFT',
        durationMinutes: 12,
        swallowingNoises: true,
      },
    },
    title: 'הנקה ישירה (שמאל)',
    details: 'משך: 12 דקות • 🦩 נשמעו קולות בליעה',
  },
  {
    name: 'diaper',
    event: {
      ...base,
      id: '3',
      eventType: 'DIAPER',
      diaper: {
        contains: 'BOTH',
        peeVolume: 'HEAVY_SOAKED',
        pooAmount: 'MEDIUM',
        pooColor: 'GREEN',
      },
    },
    title: 'חיתול: שתן + צואה',
    details: 'רטוב כבד • כמות בינוני • ירוק',
  },
  {
    name: 'sleep',
    event: {
      ...base,
      id: '4',
      eventType: 'SLEEP',
      sleep: {
        startAt: '2026-07-05T08:00:00.000Z',
        endAt: '2026-07-05T09:05:00.000Z',
        durationMinutes: 65,
      },
    },
    title: 'מחזור שינה מצוין ומעולה!',
    details: 'משך: 1ש 5ד • תחילת שינה ב-11:00 עד 12:05',
  },
  {
    name: 'activity',
    event: {
      ...base,
      id: '5',
      eventType: 'ACTIVITY',
      activity: { activityName: 'שירים', cryingIntensity: 4 },
    },
    title: 'פעילות: שירים',
    details: 'מדד בכי/אי שקט: 4/10',
  },
  {
    name: 'weight',
    event: { ...base, id: '6', eventType: 'WEIGHT', weight: { weightGrams: 5200, percentile: 40 } },
    title: 'שקילה בקליניקה',
    details: 'משקל: 5.200 ק״ג (5200 גרם) • אחוזון: 40%',
  },
  {
    name: 'pumping',
    event: {
      ...base,
      id: '7',
      eventType: 'PUMPING',
      pumping: { leftAmountMl: 50, rightAmountMl: 60 },
    },
    title: 'שאיבת חלב מונעת',
    details: 'שמאל: 50 מ״ל • ימין: 60 מ״ל (סה״ך: 110 מ״ל)',
  },
  {
    name: 'vomiting',
    event: { ...base, id: '8', eventType: 'VOMITING', vomiting: { size: 'MEDIUM' } },
    title: 'תיעוד פליטה / הקאה',
    details: 'דרגה: פליטה בינונית 💦',
  },
]

describe('TimelineRow', () => {
  function render(event: TrackerEvent, events: TrackerEvent[] = [event]): HTMLElement {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        { provide: TrackerSettingsService, useValue: { settings: signal(settings).asReadonly() } },
      ],
    })
    const fixture = TestBed.createComponent(TimelineRow)
    fixture.componentRef.setInput('event', event)
    fixture.componentRef.setInput('events', events)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  for (const c of CASES) {
    it('renders the ' + c.name + ' title and detail line (spec §2.6)', () => {
      const root = render(c.event)
      expect(root.querySelector('.row__title')?.textContent?.trim()).toBe(c.title)
      expect(root.querySelector('.row__details')?.textContent?.trim()).toBe(c.details)
    })
  }

  it('renders a supplement by its name with the parent who logged it', () => {
    const root = render({
      ...base,
      id: '9',
      eventType: 'SUPPLEMENT',
      supplement: { name: 'ויטמין D' },
    })
    expect(root.querySelector('.row__title')?.textContent?.trim()).toBe('ויטמין D')
    expect(root.querySelector('.row__details')?.textContent?.trim()).toBe('נרשם ע״י אמא')
  })

  it('F10: shows the memo badge and the note only when there is a note', () => {
    const withNote = render({ ...CASES[4].event, note: 'בכה קצת' })
    expect(withNote.querySelector('.row__memo')?.textContent?.trim()).toBe('!')
    expect(withNote.querySelector('.row__note')?.textContent).toContain('בכה קצת')
    const without = render(CASES[4].event)
    expect(without.querySelector('.row__memo')).toBeNull()
    expect(without.querySelector('.row__note')).toBeNull()
  })

  it('shows the quick-recorded badge', () => {
    const root = render({ ...CASES[2].event, quickRecorded: true })
    expect(root.querySelector('.row__quick')?.textContent?.trim()).toBe('⚡ מהיר')
  })
})

describe('timeline row rules', () => {
  const nap = (id: string, startAt: string, minutes: number): TrackerEvent => ({
    ...base,
    id,
    eventType: 'SLEEP',
    timestamp: startAt,
    sleep: {
      startAt,
      endAt: new Date(Date.parse(startAt) + minutes * 60000).toISOString(),
      durationMinutes: minutes,
    },
  })

  it('marks only the earliest long midday sleep of a day as the big nap', () => {
    const first = nap('a', '2026-07-05T10:00:00.000Z', 80)
    const second = nap('b', '2026-07-05T11:00:00.000Z', 90)
    const all = [second, first]
    expect(isBigNap(first, all)).toBe(true)
    expect(isBigNap(second, all)).toBe(false)
  })

  it('tiers a bottle by the share drunk and leaves a quick bottle without one', () => {
    const bottle = (offered: number, consumed: number): TrackerEvent => ({
      ...base,
      id: 'x',
      eventType: 'NUTRITION',
      nutrition: { feedType: 'BOTTLE', amountOfferedMl: offered, amountConsumedMl: consumed },
    })
    expect(eventTier(bottle(100, 40), [])).toBe('bad')
    expect(eventTier(bottle(100, 70), [])).toBe('okay')
    expect(eventTier(bottle(100, 90), [])).toBe('good')
    expect(eventTier(bottle(100, 100), [])).toBe('great')
    expect(
      eventTier(
        { ...base, id: 'q', eventType: 'NUTRITION', nutrition: { feedType: 'BOTTLE' } },
        [],
      ),
    ).toBeNull()
  })
})
