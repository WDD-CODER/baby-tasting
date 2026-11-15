import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Settings } from '../../../core/models/settings'
import { SettingsService } from '../../../core/services/settings.service'
import { RulesForm } from './rules-form'

const defaults: Settings = {
  introDays: 3,
  maintenancePerWeek: 2,
  maintenanceGapDays: 5,
  maintenanceUntilMonths: 24,
  maxAllergensPerMeal: 2,
  newFoodsPerWeek: 3,
}

describe('RulesForm', () => {
  function setup() {
    const saved: Partial<Settings>[] = []
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SettingsService,
          useValue: {
            settings: signal(defaults).asReadonly(),
            load: () => Promise.resolve(defaults),
            save: (values: Partial<Settings>) => {
              saved.push(values)
              return Promise.resolve({ ...defaults, ...values })
            },
            reset: () => Promise.resolve(defaults),
          },
        },
      ],
    })
    const fixture = TestBed.createComponent(RulesForm)
    return { fixture, saved }
  }

  function saveButton(root: HTMLElement): HTMLButtonElement {
    const buttons = Array.from(root.querySelectorAll('button'))
    return buttons.find((b) => b.textContent?.trim() === 'שמירה') as HTMLButtonElement
  }

  function type(root: HTMLElement, index: number, value: string): void {
    const input = root.querySelectorAll('input')[index] as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event('input'))
  }

  it('disables save and shows the range for a value outside it', async () => {
    const { fixture } = setup()
    await fixture.whenStable()
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    expect(saveButton(root).disabled).toBeTrue()

    type(root, 0, '8')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(root.textContent).toContain('טווח מותר: 1–7')
    expect(saveButton(root).disabled).toBeTrue()
  })

  it('enables save for an in-range change and sends only the changed value', async () => {
    const { fixture, saved } = setup()
    await fixture.whenStable()
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement

    type(root, 0, '4')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue()
    expect(saveButton(root).disabled).toBeFalse()

    saveButton(root).click()
    await fixture.whenStable()
    expect(saved).toEqual([{ introDays: 4 }])
  })
})
