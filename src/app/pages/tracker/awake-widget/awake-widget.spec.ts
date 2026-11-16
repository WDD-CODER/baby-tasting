import { TestBed } from '@angular/core/testing'
import { AwakeWidget, awakeLevel, awakeThresholds } from './awake-widget'

describe('awakeLevel (spec §4.4)', () => {
  it('uses the normal thresholds 35 / 45 / 60 / 60', () => {
    expect(awakeThresholds(false)).toEqual({
      widgetMin: 35,
      okayLimit: 45,
      yellowLimit: 60,
      redLimit: 60,
    })
    expect(awakeLevel(35, false)).toBeNull()
    expect(awakeLevel(36, false)).toBe('ok')
    expect(awakeLevel(45, false)).toBe('ok')
    expect(awakeLevel(46, false)).toBe('soon')
    expect(awakeLevel(60, false)).toBe('soon')
    expect(awakeLevel(61, false)).toBe('over')
  })

  it('uses 45 / 60 / 75 / 90 in the bath slot, with the bath state between 76 and 89', () => {
    expect(awakeThresholds(true)).toEqual({
      widgetMin: 45,
      okayLimit: 60,
      yellowLimit: 75,
      redLimit: 90,
    })
    expect(awakeLevel(45, true)).toBeNull()
    expect(awakeLevel(46, true)).toBe('ok')
    expect(awakeLevel(60, true)).toBe('ok')
    expect(awakeLevel(75, true)).toBe('soon')
    expect(awakeLevel(76, true)).toBe('bath')
    expect(awakeLevel(89, true)).toBe('bath')
    expect(awakeLevel(90, true)).toBe('over')
  })
})

describe('AwakeWidget', () => {
  function render(minutes: number, bath = false): HTMLElement {
    const fixture = TestBed.createComponent(AwakeWidget)
    fixture.componentRef.setInput('minutes', minutes)
    fixture.componentRef.setInput('bathActive', bath)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('is hidden at or under the minimum', () => {
    expect(render(30).querySelector('.awake')).toBeNull()
  })

  it('shows the heading and the minutes', () => {
    const el = render(50)
    expect(el.textContent).toContain('חלון שינה בקרוב! 🥱')
    expect(el.textContent).toContain('50 דק׳')
  })

  it('shows hours and minutes from one hour on, and the over-tired text', () => {
    const el = render(75)
    expect(el.textContent).toContain('1ש׳ 15ד׳')
    expect(el.textContent).toContain('עייפות יתר! להרדים מיד ⚠️')
  })
})
