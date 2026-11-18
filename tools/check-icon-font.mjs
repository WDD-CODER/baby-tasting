// Fails when an icon the app shows by default is missing from the small icon font's name list
// (src/app/core/icons/app-icon-names.ts). Fix: node tools/build-icon-font.mjs and commit both outputs.
import fs from 'node:fs'
import { NAMES_FILE, collectIconNames } from './build-icon-font.mjs'

const listed = new Set([...fs.readFileSync(NAMES_FILE, 'utf8').matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]))
const missing = collectIconNames().filter((name) => !listed.has(name))

if (missing.length) {
  console.error(`ICON_FONT: missing from app-icon-names.ts: ${missing.join(', ')}`)
  process.exit(1)
}
console.log('ICON_FONT: ok')
