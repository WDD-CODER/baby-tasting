import { alertText } from './alerts'

describe('alertText', () => {
  it('fills the intro_missing text', () => {
    expect(
      alertText({ id: 'x', kind: 'intro_missing', allergenId: 'a', allergenName: 'שומשום' }),
    ).toBe('חסר יום ברצף — כדאי לתת היום שומשום')
  })

  it('fills the gap and week texts', () => {
    expect(
      alertText({ id: 'x', kind: 'maintenance_gap', allergenId: 'a', allergenName: 'ביצה', n: 6 }),
    ).toBe('עברו 6 ימים בלי ביצה')
    expect(
      alertText({
        id: 'x',
        kind: 'maintenance_week',
        allergenId: 'a',
        allergenName: 'ביצה',
        x: 1,
        y: 2,
      }),
    ).toBe('השבוע: ביצה ניתן 1 מתוך 2')
  })
})
