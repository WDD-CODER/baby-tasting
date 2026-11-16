import { ConflictInfo } from '../models/api-error'
import { conflictMessage, isOpenSleepConflict } from './conflict-message'

// 2026-11-16 in Jerusalem is UTC+2: 12:10Z = 14:10, 13:40Z = 15:40
const closed: ConflictInfo = {
  id: 's1',
  eventType: 'SLEEP',
  startAt: '2026-11-16T12:10:00.000Z',
  endAt: '2026-11-16T13:40:00.000Z',
}
const open: ConflictInfo = {
  id: 's2',
  eventType: 'SLEEP',
  startAt: '2026-11-16T14:49:00.000Z',
  endAt: null,
}
const feed: ConflictInfo = {
  id: 'f1',
  eventType: 'NUTRITION',
  startAt: '2026-11-16T12:30:00.000Z',
  endAt: null,
}

describe('conflictMessage', () => {
  it('a sleep over a closed sleep', () => {
    expect(conflictMessage(closed, 'SLEEP')).toBe('השינה חופפת לשינה מ-14:10 עד 15:40 (16/11)')
  })

  it('a sleep over the open sleep', () => {
    expect(conflictMessage(open, 'SLEEP')).toBe('השינה חופפת לשינה הפעילה שהתחילה ב-16:49')
  })

  it('an awake-only event inside a closed sleep', () => {
    expect(conflictMessage(closed, 'NUTRITION')).toBe('התינוק ישן אז: שינה מ-14:10 עד 15:40')
  })

  it('a sleep that would cover a feed', () => {
    expect(conflictMessage(feed, 'SLEEP')).toBe('בזמן הזה יש האכלה ב-14:30')
  })

  it('knows when the open sleep is the blocker of an awake-only event', () => {
    expect(isOpenSleepConflict(open, 'NUTRITION')).toBeTrue()
    expect(isOpenSleepConflict(open, 'SLEEP')).toBeFalse()
    expect(isOpenSleepConflict(closed, 'NUTRITION')).toBeFalse()
  })
})
