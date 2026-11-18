// Run after the production build. Keeps the first visit small:
//  - the small icon font is at most 150 kB, the two app icons at most 60 kB each
//  - the first-load scripts (main-*.js and the chunks it imports statically) are at most 400 kB raw
//  - none of them holds the full icon name list (the icon name `zoom_out_map`)
import fs from 'node:fs'
import path from 'node:path'

const KB = 1024
const DIR = path.join('dist', 'baby-tasting', 'browser')
const problems = []

function sizeOf(file) {
  return fs.statSync(file).size
}

if (!fs.existsSync(DIR)) {
  console.error(`PERF_BUDGET: ${DIR} not found; run the production build first`)
  process.exit(1)
}

const files = fs.readdirSync(DIR)
const font = fs.existsSync(path.join(DIR, 'media'))
  ? fs.readdirSync(path.join(DIR, 'media')).filter((f) => /^material-symbols-app.*\.woff2$/.test(f))
  : []
if (font.length !== 1) problems.push(`the small icon font is not in ${DIR}/media (found ${font.length})`)
else if (sizeOf(path.join(DIR, 'media', font[0])) > 150 * KB) problems.push(`small icon font over 150 kB: ${font[0]}`)

for (const icon of ['pwa-192x192.png', 'pwa-512x512.png']) {
  const file = path.join(DIR, icon)
  if (!fs.existsSync(file)) problems.push(`${icon} is missing`)
  else if (sizeOf(file) > 60 * KB) problems.push(`${icon} over 60 kB: ${sizeOf(file)} bytes`)
}

// main-*.js and the chunks it imports statically (import ... from "./chunk-X.js" / import "./chunk-X.js")
const main = files.find((f) => /^main-.*\.js$/.test(f))
if (!main) problems.push('main-*.js not found')
else {
  const seen = new Set()
  const queue = [main]
  while (queue.length) {
    const name = queue.pop()
    if (seen.has(name)) continue
    seen.add(name)
    const text = fs.readFileSync(path.join(DIR, name), 'utf8')
    for (const m of text.matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[^'"()]*?from\s*)?["']\.\/([^"']+\.js)["']/g)) {
      if (fs.existsSync(path.join(DIR, m[1]))) queue.push(m[1])
    }
    if (text.includes('zoom_out_map')) problems.push(`${name} holds the full icon name list (zoom_out_map)`)
  }
  const total = [...seen].reduce((sum, name) => sum + sizeOf(path.join(DIR, name)), 0)
  if (total > 400 * KB) problems.push(`first-load scripts over 400 kB: ${total} bytes in ${seen.size} files`)
  console.log(`first-load scripts: ${seen.size} files, ${total} bytes`)
}

if (problems.length) {
  for (const p of problems) console.error(`PERF_BUDGET: ${p}`)
  process.exit(1)
}
console.log('PERF_BUDGET: ok')
