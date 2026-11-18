/** One row of `public/emoji-search.json`: [emoji, Hebrew names and keywords, English names and keywords]. */
export type EmojiRow = readonly [string, string, string]

/** Lower-cases and drops Hebrew points so a typed query matches the stored words. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, '')
    .trim()
}

/** Rows whose Hebrew or English words contain every typed word; at most `limit`. An empty query matches nothing. */
export function searchEmoji(rows: readonly EmojiRow[], query: string, limit = 120): string[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const out: string[] = []
  for (const [emoji, he, en] of rows) {
    const hay = `${normalize(he)} ${en}`
    if (words.every((w) => hay.includes(w))) {
      out.push(emoji)
      if (out.length >= limit) break
    }
  }
  return out
}
