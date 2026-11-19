import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TrackerSettings } from '../../../core/models/tracker-settings'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { IconPickerSheet } from './icon-picker-sheet'

const base: TrackerSettings = {
  parentAName: 'אמא',
  parentBName: 'אבא',
  defaultBottleType: 'EXPRESSED_MILK',
  customActivities: [],
  quickActionOrder: ['meal', 'diaper', 'sleep', 'activity', 'weight', 'vomiting'],
  quickActionsMinimized: [],
  iconOverrides: { 'quick.weight': 'scale' },
}

describe('IconPickerSheet', () => {
  function setup() {
    const saved: Partial<TrackerSettings>[] = []
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TrackerSettingsService,
          useValue: {
            settings: signal(base).asReadonly(),
            save: (values: Partial<TrackerSettings>) => {
              saved.push(values)
              return Promise.resolve({ ...base, ...values })
            },
          },
        },
      ],
    })
    const fixture = TestBed.createComponent(IconPickerSheet)
    fixture.componentRef.setInput('slot', 'quick.sleep')
    fixture.detectChanges()
    return { fixture, saved }
  }

  function button(root: HTMLElement, label: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement
  }

  it('saves the chosen icon next to the other overrides', async () => {
    const { fixture, saved } = setup()
    const root = fixture.nativeElement as HTMLElement
    ;(fixture.componentInstance as unknown as { chosen_: { set(v: string): void } }).chosen_.set(
      'nightlight',
    )
    button(root, 'שמירה').click()
    await fixture.whenStable()
    expect(saved).toEqual([
      { iconOverrides: { 'quick.weight': 'scale', 'quick.sleep': 'nightlight' } },
    ])
  })

  it('איפוס לברירת מחדל removes the slot override only', async () => {
    const { fixture, saved } = setup()
    const root = fixture.nativeElement as HTMLElement
    button(root, 'איפוס לברירת מחדל').click()
    await fixture.whenStable()
    expect(saved).toEqual([{ iconOverrides: { 'quick.weight': 'scale' } }])
  })
})
