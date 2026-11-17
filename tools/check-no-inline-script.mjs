// Fails when the built index.html holds an inline <script>, a Beasties marker
// or a media="print" stylesheet: the server CSP (script-src 'self') blocks them.
import fs from 'node:fs'
import path from 'node:path'

const file = path.join('dist', 'baby-tasting', 'browser', 'index.html')
if (!fs.existsSync(file)) {
  console.error(`INLINE: ${file} not found (run the build first)`)
  process.exit(1)
}
const html = fs.readFileSync(file, 'utf8')
const problems = []
for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
  if (!/\bsrc\s*=/i.test(m[1])) problems.push(`inline script: ${m[0]}`)
}
if (/data-beasties-media/i.test(html)) problems.push('data-beasties-media found')
for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
  if (/rel=["']stylesheet["']/i.test(m[0]) && /media=["']print["']/i.test(m[0])) {
    problems.push('media="print" stylesheet found')
  }
}
if (problems.length) {
  console.error(`INLINE: ${problems.length}`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log('INLINE: none')
