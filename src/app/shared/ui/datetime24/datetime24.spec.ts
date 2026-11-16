import { TestBed } from '@angular/core/testing'
import {
  addWallMinutes,
  israelToIso,
  nowInIsrael,
  toIsraelString,
} from '../../../core/utils/israel-time'
import { DateTime24 } from './datetime24'

describe('DateTime24', () => {
  function setup(value = '') {
    const fixture = TestBed.createComponent(DateTime24)
    fixture.componentRef.setInput('value', value)
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    const byText = (label: string): HTMLButtonElement => {
      const button = Array.from(root.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      )
      if (!button) throw new Error(`no button ${label}`)
      return button
    }
    const byLabel = (label: string): HTMLButtonElement => {
      const button = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      if (!button) throw new Error(`no button labelled ${label}`)
      return button
    }
    return { fixture, root, byText, byLabel }
  }

  it('toIsraelString gives Asia/Jerusalem wall-clock time, summer and winter', () => {
    expect(toIsraelString(Date.parse('2026-07-05T11:30:00Z'))).toBe('2026-07-05T14:30')
    expect(toIsraelString(Date.parse('2026-01-05T11:30:00Z'))).toBe('2026-01-05T13:30')
    expect(toIsraelString(Date.parse('2026-07-05T21:30:00Z'))).toBe('2026-07-06T00:30')
  })

  it('israelToIso reads a wall-clock value as Jerusalem time, not the browser zone', () => {
    expect(israelToIso('2026-07-05T14:30')).toBe('2026-07-05T11:30:00.000Z')
    expect(israelToIso('2026-01-05T13:30')).toBe('2026-01-05T11:30:00.000Z')
    expect(israelToIso('2026-07-05')).toBeNull()
  })

  it('the Now chip sets the Israel wall-clock now', () => {
    const { fixture, byText } = setup('2020-01-01T00:00')
    byText('עכשיו').click()
    expect(fixture.componentInstance.value()).toBe(nowInIsrael())
  })

  it('the nudge rolls the day over and "an hour ago" uses Israel now', () => {
    const { fixture, byLabel, byText } = setup('2026-07-05T23:58')
    expect(addWallMinutes('2026-07-05T23:58', 5)).toBe('2026-07-06T00:03')
    byLabel('הוסף 5 דקות').click()
    expect(fixture.componentInstance.value()).toBe('2026-07-06T00:03')
    byText('לפני שעה').click()
    expect(fixture.componentInstance.value()).toBe(addWallMinutes(nowInIsrael(), -60))
  })

  it('picking an hour from the 24-hour list keeps the minutes', () => {
    const { fixture, root, byLabel } = setup('2026-07-05T14:30')
    byLabel('שעה').click()
    fixture.detectChanges()
    const options = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="option"]'))
    expect(options.length).toBe(24)
    options.find((o) => o.textContent?.trim() === '23')?.click()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T23:30')
  })
})
