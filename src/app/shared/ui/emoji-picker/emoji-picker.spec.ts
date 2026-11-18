import { ComponentFixture, TestBed } from '@angular/core/testing'
import { EmojiPicker, FOOD_EMOJI } from './emoji-picker'
import { EmojiRow } from './emoji-search'

const ROWS: EmojiRow[] = [
  ['🥑', 'אבוקדו אוכל מאכל פרי', 'avocado food fruit'],
  ['🚗', 'מכונית', 'car automobile'],
]

describe('EmojiPicker', () => {
  let fixture: ComponentFixture<EmojiPicker>

  const grid = (): string[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.picker__item') as NodeListOf<HTMLElement>,
    ).map((el) => el.textContent?.trim() ?? '')

  const type = (text: string): void => {
    const input = fixture.nativeElement.querySelector('.picker__search') as HTMLInputElement
    input.value = text
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(EmojiPicker)
    fixture.componentRef.setInput('rows', ROWS)
    fixture.detectChanges()
  })

  it('shows the food list first when the search is empty', () => {
    expect(grid()).toEqual([...FOOD_EMOJI])
  })

  it('finds 🥑 for אבוקדו', () => {
    type('אבוקדו')
    expect(grid()).toEqual(['🥑'])
  })

  it('finds 🥑 for avocado', () => {
    type('avocado')
    expect(grid()).toEqual(['🥑'])
  })

  it('has "no icon" selected for an empty value and lets the parent pick it again', () => {
    const none = fixture.nativeElement.querySelector('.picker__none') as HTMLButtonElement
    expect(none.getAttribute('aria-pressed')).toBe('true')
    fixture.componentInstance.value.set('🥑')
    fixture.detectChanges()
    expect(none.getAttribute('aria-pressed')).toBe('false')
    none.click()
    expect(fixture.componentInstance.value()).toBe('')
  })
})
