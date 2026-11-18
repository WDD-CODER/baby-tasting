import { EmojiRow, searchEmoji } from './emoji-search'

const ROWS: EmojiRow[] = [
  ['🥑', 'אבוקדו אוכל מאכל פרי', 'avocado food fruit'],
  ['🍎', 'תפוח אדום פרי', 'red apple food fruit'],
]

describe('searchEmoji', () => {
  it('finds 🥑 for אבוקדו', () => {
    expect(searchEmoji(ROWS, 'אבוקדו')).toEqual(['🥑'])
  })

  it('finds 🥑 for avocado, ignoring case', () => {
    expect(searchEmoji(ROWS, 'Avocado')).toEqual(['🥑'])
  })

  it('needs every typed word', () => {
    expect(searchEmoji(ROWS, 'פרי אדום')).toEqual(['🍎'])
    expect(searchEmoji(ROWS, 'פרי')).toEqual(['🥑', '🍎'])
  })

  it('returns nothing for an empty query', () => {
    expect(searchEmoji(ROWS, '  ')).toEqual([])
  })
})
