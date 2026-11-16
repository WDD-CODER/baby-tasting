/** The icon shown for a food saved without one (`emoji: ''`, D-017-4). One constant, used everywhere. */
export const NO_ICON_PLACEHOLDER = '🍽️'

/** The icon to render for a food's stored emoji. */
export function foodIcon(emoji: string | null | undefined): string {
  return emoji && emoji.trim() !== '' ? emoji : NO_ICON_PLACEHOLDER
}
