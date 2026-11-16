import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NewTrackerEvent, TrackerEvent } from '../../../core/models/tracker-event'
import { BottleType, TrackerSettings } from '../../../core/models/tracker-settings'
import { DoubleSubmitService } from '../../../core/services/double-submit.service'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { EntrySheet } from './entry-sheet'

function settings(defaultBottleType: BottleType): TrackerSettings {
  return {
    parentAName: 'אמא',
    parentBName: 'אבא',
    defaultBottleType,
    customActivities: ['שירים'],
    quickActionOrder: ['meal', 'diaper', 'sleep', 'activity', 'weight', 'vomiting'],
    iconOverrides: {},
  }
}

describe('EntrySheet', () => {
  function setup(defaultBottleType: BottleType = 'EXPRESSED_MILK') {
    const created: NewTrackerEvent[] = []
    const events = {
      events: signal<TrackerEvent[]>([]).asReadonly(),
      openSleep: signal<TrackerEvent | null>(null).asReadonly(),
      create: (body: NewTrackerEvent) => {
        created.push(body)
        return Promise.resolve({ id: 'e1' } as TrackerEvent)
      },
      showUndo: () => undefined,
      toggleSleep: () => Promise.reject(new Error('not used')),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: TrackerEventsService, useValue: events },
        {
          provide: TrackerSettingsService,
          useValue: { settings: signal(settings(defaultBottleType)).asReadonly() },
        },
      ],
    })
    const fixture = TestBed.createComponent(EntrySheet)
    fixture.componentRef.setInput('type', 'bottle')
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    const button = (text: string): HTMLButtonElement => {
      const found = Array.from(root.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(text),
      )
      if (!found) throw new Error(`no button with ${text}`)
      return found
    }
    const type = (id: string, value: string): void => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)
      if (!input) throw new Error(`no input ${id}`)
      input.value = value
      input.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    const closed: number[] = []
    fixture.componentInstance.closed.subscribe(() => closed.push(1))
    return { fixture, root, created, button, type, closed }
  }

  it('F3: a new bottle entry starts with the default bottle type from the settings', async () => {
    const { fixture, button, created } = setup('FORMULA')
    button('בקבוק (שאוב').click()
    fixture.detectChanges()
    await fixture.componentInstance.submit()
    expect(created.length).toBe(1)
    expect(created[0].nutrition?.bottleLiquidType).toBe('FORMULA')
  })

  it('F3: with the expressed-milk default the entry saves expressed milk', async () => {
    const { fixture, button, created } = setup('EXPRESSED_MILK')
    button('בקבוק (שאוב').click()
    fixture.detectChanges()
    await fixture.componentInstance.submit()
    expect(created[0].nutrition?.bottleLiquidType).toBe('EXPRESSED_MILK')
  })

  it('F4: a save refused by validation does not start the 10 s guard, so the fixed retry saves at once', async () => {
    const { fixture, button, type, created, root } = setup()
    button('בקבוק (שאוב').click()
    fixture.detectChanges()

    type('es-consumed', '200')
    await fixture.componentInstance.submit()
    fixture.detectChanges()
    expect(created.length).toBe(0)
    expect(root.textContent).toContain('כמות שנצרכה לא יכולה להיות גדולה מכמות שהוצעה')

    type('es-consumed', '100')
    await fixture.componentInstance.submit()
    expect(created.length).toBe(1)
    expect(created[0].nutrition?.amountConsumedMl).toBe(100)
  })

  it('F4: an empty amount shows the validation message and the next valid save is not blocked', async () => {
    const { fixture, button, type, created, root } = setup()
    button('בקבוק (שאוב').click()
    fixture.detectChanges()

    type('es-offered', '')
    await fixture.componentInstance.submit()
    fixture.detectChanges()
    expect(created.length).toBe(0)
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('יש להזין כמות')

    type('es-offered', '120')
    type('es-consumed', '120')
    await fixture.componentInstance.submit()
    expect(created.length).toBe(1)
  })

  it('the guard still blocks a second valid save of the same kind within 10 s', async () => {
    const { fixture, created } = setup()
    const toast = TestBed.inject(ToastService)
    await fixture.componentInstance.submit()
    await fixture.componentInstance.submit()
    expect(created.length).toBe(1)
    expect(toast.messages().some((m) => m.text.includes('10 השניות האחרונות'))).toBeTrue()
  })

  it('DoubleSubmitService blocks inside 10 s and allows after', () => {
    const guard = TestBed.inject(DoubleSubmitService)
    expect(guard.isDuplicate('X', 1000)).toBeFalse()
    expect(guard.isDuplicate('X', 5000)).toBeTrue()
    expect(guard.isDuplicate('X', 11001)).toBeFalse()
  })
})
