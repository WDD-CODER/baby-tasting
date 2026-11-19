import { TestBed } from '@angular/core/testing'
import {
  addWallMinutes,
  israelToIso,
  nowInIsrael,
  toIsraelString,
} from '../../../core/utils/israel-time'
import { DateTime24, DateMode, formatTyped, parseTyped } from './datetime24'

describe('DateTime24', () => {
  function setup(value = '', dateMode: DateMode = 'date') {
    const fixture = TestBed.createComponent(DateTime24)
    fixture.componentRef.setInput('value', value)
    fixture.componentRef.setInput('dateMode', dateMode)
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
    const typedField = (): HTMLInputElement => {
      const field = root.querySelector<HTMLInputElement>('input.dt__typed')
      if (!field) throw new Error('no typed field')
      return field
    }
    const type = (text: string): void => {
      const field = typedField()
      field.value = text
      field.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    return { fixture, root, byText, byLabel, typedField, type }
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

  it('the typed field is numeric and comes first', () => {
    const { root, typedField } = setup('2026-07-05T14:30')
    expect(typedField().getAttribute('inputmode')).toBe('numeric')
    expect(root.querySelector('input')).toBe(typedField())
    expect(typedField().value).toBe('14:30')
  })

  it('typing 0730 gives 07:30 and keeps the date', () => {
    const { fixture, typedField, type } = setup('2026-07-05T14:30')
    type('0730')
    expect(typedField().value).toBe('07:30')
    expect(fixture.componentInstance.value()).toBe('2026-07-05T07:30')
  })

  it('typing 25:10 shows the error and keeps the value', () => {
    const { fixture, root, type } = setup('2026-07-05T14:30')
    type('25:10')
    expect(root.querySelector('.dt__error')?.textContent).toContain('00:00')
    expect(root.querySelector('input.dt__typed')?.getAttribute('aria-invalid')).toBe('true')
    expect(fixture.componentInstance.value()).toBe('2026-07-05T14:30')
    type('2359')
    expect(root.querySelector('.dt__error')).toBeNull()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T23:59')
  })

  it('formatTyped inserts the colon; parseTyped accepts 00:00-23:59 only', () => {
    expect(formatTyped('7')).toBe('7')
    expect(formatTyped('073')).toBe('07:3')
    expect(formatTyped('07:305')).toBe('07:30')
    expect(parseTyped('0000')).toBe('00:00')
    expect(parseTyped('23:59')).toBe('23:59')
    expect(parseTyped('2400')).toBeNull()
    expect(parseTyped('1260')).toBeNull()
    expect(parseTyped('730')).toBeNull()
  })

  it('−15 from 10:05 gives 09:50, and the chips cross midnight', () => {
    const { fixture, byText, byLabel } = setup('2026-07-05T10:05')
    byText('−15').click()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T09:50')
    byLabel('הפחת 30 דקות').click()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T09:20')
    fixture.componentRef.setInput('value', '2026-07-06T00:03')
    byText('−5').click()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T23:58')
    expect(addWallMinutes('2026-07-05T23:58', 5)).toBe('2026-07-06T00:03')
  })

  it('the Now chip sets the Israel wall-clock now', () => {
    const { fixture, byText } = setup('2020-01-01T00:00')
    byText('עכשיו').click()
    expect(fixture.componentInstance.value()).toBe(nowInIsrael())
  })

  it("dateMode 'none' renders no date chips and no calendar", () => {
    const { root } = setup('2026-07-05T14:30', 'none')
    const labels = Array.from(root.querySelectorAll('button')).map((b) => b.textContent?.trim())
    expect(labels).not.toContain('היום')
    expect(labels).not.toContain('אתמול')
    expect(root.querySelector('button[aria-label="בחר תאריך"]')).toBeNull()
    expect(root.querySelector('.dt__preview')).toBeNull()
  })

  it("dateMode 'date' shows the date chips", () => {
    const { byText, byLabel } = setup('2026-07-05T14:30')
    expect(byText('היום')).toBeTruthy()
    expect(byText('אתמול')).toBeTruthy()
    expect(byLabel('בחר תאריך')).toBeTruthy()
  })

  it('focusing the typed field selects all of it', () => {
    const { fixture, typedField } = setup('2026-07-05T14:30')
    const field = typedField()
    document.body.appendChild(fixture.nativeElement as HTMLElement)
    field.dispatchEvent(new Event('focus'))
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(5)
  })

  it('the clock button opens the box: hour 14 then minute 35 sets 14:35 and closes it', () => {
    const { fixture, root, byText, byLabel } = setup('2026-07-05T09:10')
    expect(root.querySelector('.dt__box')).toBeNull()
    byLabel('בחירת שעה').click()
    fixture.detectChanges()
    expect(root.querySelectorAll('.dt__grid .dt__opt').length).toBe(24)
    byText('14').click()
    fixture.detectChanges()
    expect(root.querySelectorAll('.dt__grid .dt__opt').length).toBe(12)
    byText('35').click()
    fixture.detectChanges()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T14:35')
    expect(root.querySelector('.dt__box')).toBeNull()
    expect(root.querySelector<HTMLInputElement>('input.dt__typed')?.value).toBe('14:35')
  })

  it('ביטול and the backdrop close the box and leave the value unchanged', () => {
    const { fixture, root, byText, byLabel } = setup('2026-07-05T09:10')
    byLabel('בחירת שעה').click()
    fixture.detectChanges()
    byText('ביטול').click()
    fixture.detectChanges()
    expect(root.querySelector('.dt__box')).toBeNull()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T09:10')
    byLabel('בחירת שעה').click()
    fixture.detectChanges()
    root.querySelector<HTMLElement>('.dt__backdrop')?.click()
    fixture.detectChanges()
    expect(root.querySelector('.dt__box')).toBeNull()
    expect(fixture.componentInstance.value()).toBe('2026-07-05T09:10')
  })
})
