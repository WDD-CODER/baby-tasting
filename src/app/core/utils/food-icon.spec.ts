import { NO_ICON_PLACEHOLDER, foodIcon } from './food-icon'

describe('foodIcon', () => {
  it('renders the placeholder for an empty emoji', () => {
    expect(foodIcon('')).toBe(NO_ICON_PLACEHOLDER)
    expect(foodIcon('  ')).toBe(NO_ICON_PLACEHOLDER)
    expect(foodIcon(undefined)).toBe(NO_ICON_PLACEHOLDER)
  })

  it('keeps a real emoji', () => {
    expect(foodIcon('🥑')).toBe('🥑')
  })
})
