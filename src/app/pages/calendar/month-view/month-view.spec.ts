import { TestBed } from '@angular/core/testing'
import { CalendarItem } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { MonthView } from './month-view'

function food(id: string, emoji: string, allergenId: string | null): Food {
  return {
    id,
    name: id,
    emoji,
    category: 'fruits',
    allergenId,
    warning: null,
    builtIn: false,
    archived: false,
    queuePosition: null,
    status: { tried: false, firstDate: null, timesGiven: 0, liked: null },
  }
}

function item(id: string, foodId: string, meal: 1 | 2 | 3): CalendarItem {
  return {
    id,
    date: '2026-11-17',
    meal,
    foodId,
    status: 'planned',
    amount: null,
    note: '',
    liked: null,
    givenBy: null,
    givenAt: null,
  }
}

describe('MonthView', () => {
  it('shows 4 emoji and +2 for a day with 6 items, allergen items first', () => {
    const fixture = TestBed.createComponent(MonthView)
    fixture.componentRef.setInput('month', '2026-11-01')
    fixture.componentRef.setInput('today', '2026-11-15')
    fixture.componentRef.setInput('foods', [
      food('a', '🥜', 'peanut'),
      food('b', '🥛', 'milk'),
      food('c', '🍌', null),
      food('d', '🍎', null),
      food('e', '🥕', null),
      food('f', '🍐', null),
    ])
    fixture.componentRef.setInput('items', [
      item('1', 'c', 1),
      item('2', 'd', 1),
      item('3', 'e', 2),
      item('4', 'f', 3),
      item('5', 'a', 1),
      item('6', 'b', 1),
    ])
    fixture.detectChanges()

    const day = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-date="2026-11-17"]',
    ) as HTMLElement
    const emoji = Array.from(day.querySelectorAll('.day__item')).map((n) => n.textContent?.trim())
    expect(emoji.length).toBe(4)
    expect(emoji.slice(0, 2)).toEqual(['🥜', '🥛'])
    expect(day.querySelector('.day__more')?.textContent?.trim()).toBe('+2')
  })
})
