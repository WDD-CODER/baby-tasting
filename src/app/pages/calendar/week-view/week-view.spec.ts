import { TestBed } from '@angular/core/testing'
import { CalendarItem } from '../../../core/models/calendar-item'
import { Food } from '../../../core/models/food'
import { WeekView } from './week-view'

const food: Food = {
  id: 'f1',
  name: 'בננה',
  emoji: '🍌',
  category: 'fruits',
  allergenId: null,
  warning: null,
  builtIn: true,
  archived: false,
  status: { tried: false, firstDate: null, timesGiven: 0, liked: null },
}

const item: CalendarItem = {
  id: 'i1',
  date: '2026-11-17',
  meal: 2,
  foodId: 'f1',
  status: 'planned',
  amount: null,
  note: '',
  liked: null,
  givenBy: null,
  givenAt: null,
}

describe('WeekView', () => {
  it('renders Sunday first, on the right, inside dir="rtl"', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('dir', 'rtl')
    document.body.appendChild(wrapper)
    const fixture = TestBed.createComponent(WeekView)
    wrapper.appendChild(fixture.nativeElement as HTMLElement)
    fixture.componentRef.setInput('weekStart', '2026-11-15')
    fixture.componentRef.setInput('today', '2026-11-17')
    fixture.componentRef.setInput('items', [item])
    fixture.componentRef.setInput('foods', [food])
    fixture.detectChanges()

    const el = fixture.nativeElement as HTMLElement
    expect(el.closest('[dir="rtl"]')).toBeTruthy()
    const heads = Array.from(el.querySelectorAll<HTMLElement>('.head'))
    expect(heads.length).toBe(7)
    expect(heads[0].textContent).toContain('א׳')
    expect(heads[0].textContent).toContain('15')
    expect(heads[0].getBoundingClientRect().left).toBeGreaterThan(
      heads[6].getBoundingClientRect().left,
    )
    expect(
      el.querySelector('.cell[data-date="2026-11-17"][data-meal="2"] app-item-tile'),
    ).toBeTruthy()

    fixture.destroy()
    wrapper.remove()
  })
})
