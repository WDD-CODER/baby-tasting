import { addDays, addMonths, monthGrid, monthTitle, weekStart, weekTitle } from './dates'

describe('dates', () => {
  it('finds the Sunday of a week', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-15')
    expect(weekStart('2026-11-21')).toBe('2026-11-15')
  })

  it('adds days across a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })

  it('builds a 6x7 month grid starting on Sunday', () => {
    const grid = monthGrid('2026-11-15')
    expect(grid.length).toBe(42)
    expect(grid[0]).toBe('2026-11-01')
    expect(monthGrid('2026-12-10')[0]).toBe('2026-11-29')
  })

  it('moves by months', () => {
    expect(addMonths('2026-11-15', -1)).toBe('2026-10-01')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01')
  })

  it('titles the visible range', () => {
    expect(weekTitle('2026-11-15')).toBe('15–21 בנובמבר 2026')
    expect(monthTitle('2026-11-03')).toBe('נובמבר 2026')
  })
})
