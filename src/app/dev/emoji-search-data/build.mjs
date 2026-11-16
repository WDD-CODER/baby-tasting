// Builds public/emoji-search.json (the offline emoji search data, D-017-3).
// Sources: `emojibase-data/en/compact.json` (emoji list, English names and tags) and the CLDR Hebrew annotations
// (`cldr-annotations-full/annotations/he/annotations.json`; emojibase-data ships no Hebrew set).
// Run:  node src/app/dev/emoji-search-data/build.mjs <path to he/annotations.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const en = require('emojibase-data/en/compact.json')
const heFile = process.argv[2]
if (!heFile) throw new Error('usage: build.mjs <he/annotations.json>')
const he = JSON.parse(readFileSync(heFile, 'utf8')).annotations.annotations

const strip = (s) => s.replaceAll('️', '')
const heByEmoji = new Map(Object.entries(he).map(([k, v]) => [strip(k), v]))

// each row: [emoji, hebrew words, english words]
const rows = []
for (const e of en) {
  if (e.group === 2 || e.group === undefined) continue // skin-tone components
  const h = heByEmoji.get(strip(e.unicode))
  const heWords = h ? [...(h.tts ?? []), ...(h.default ?? [])].join(' ') : ''
  const enWords = [e.label, ...(e.tags ?? [])].join(' ').toLowerCase()
  rows.push([e.unicode, heWords, enWords])
}
writeFileSync(new URL('../../../../public/emoji-search.json', import.meta.url), JSON.stringify(rows))
console.log(`${rows.length} emoji, ${rows.filter((r) => r[1]).length} with Hebrew names`)
