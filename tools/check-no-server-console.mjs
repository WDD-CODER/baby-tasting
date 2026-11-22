// Fails when `console.*` appears in server code (D-028-7). Everything logs through server/lib/logger.js.
// Command-line tools are exempt: server/test/**, server/seed/**, server/lib/gen-icon-names.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CALL = /\bconsole\.\w+\s*\(/
const EXT = /\.(js|mjs)$/
const SKIP_DIRS = new Set(['node_modules', 'test', 'seed'])
const SKIP_FILES = new Set(['server/lib/gen-icon-names.mjs'])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(full)
    return EXT.test(entry.name) ? [full] : []
  })
}

export function scan(root) {
  const hits = []
  for (const file of walk(path.join(root, 'server'))) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    if (SKIP_FILES.has(rel)) continue
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (CALL.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`)
      })
  }
  return hits
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const hits = scan(root)
  if (hits.length) {
    console.error(hits.join('\n'))
    console.error(`SERVER_CONSOLE: ${hits.length} found`)
    process.exit(1)
  }
  console.log('SERVER_CONSOLE: none')
}
