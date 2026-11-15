import { ageParts, todayInJerusalem } from './age'

describe('ageParts', () => {
  it('counts whole months and total days', () => {
    expect(ageParts('2026-06-15', '2026-11-15')).toEqual({ months: 5, days: 153 })
  })

  it('does not count a month that is not complete', () => {
    expect(ageParts('2026-06-16', '2026-11-15').months).toBe(4)
  })

  it('is under one month for a few days old', () => {
    expect(ageParts('2026-11-10', '2026-11-15')).toEqual({ months: 0, days: 5 })
  })

  it('counts a birth on the 31st as a full month on the last day of a shorter month', () => {
    expect(ageParts('2026-01-31', '2026-02-28').months).toBe(1)
    expect(ageParts('2026-01-31', '2026-02-27').months).toBe(0)
  })

  it('handles leap years', () => {
    expect(ageParts('2024-01-31', '2024-02-29')).toEqual({ months: 1, days: 29 })
    expect(ageParts('2024-02-29', '2025-02-28').months).toBe(12)
    expect(ageParts('2024-02-29', '2024-03-29').months).toBe(1)
  })

  it('never goes negative', () => {
    expect(ageParts('2026-12-01', '2026-11-15')).toEqual({ months: 0, days: 0 })
  })
})

describe('todayInJerusalem', () => {
  it('uses the Jerusalem date, not the UTC date', () => {
    expect(todayInJerusalem(new Date('2026-11-14T22:30:00Z'))).toBe('2026-11-15')
  })
})
