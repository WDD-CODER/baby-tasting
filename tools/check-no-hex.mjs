// Fails when a colour literal (hex, rgb(), hsl()) appears under src/app/ (INV-5).
// Colours live only in src/styles/tokens.scss.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HEX = /#[0-9a-fA-F]{3,8}\b/
const FUNC = /\b(?:rgba?|hsla?)\(/
const EXT = /\.(scss|ts|html)$/

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return EXT.test(entry.name) ? [full] : []
  })
}

export function scan(root) {
  const hits = []
  for (const file of walk(path.join(root, 'src', 'app'))) {
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (HEX.test(line) || FUNC.test(line)) {
          hits.push(`${path.relative(root, file).split(path.sep).join('/')}:${i + 1}: ${line.trim()}`)
        }
      })
  }
  return hits
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-no-hex-'))
  try {
    const appDir = path.join(tmp, 'src', 'app')
    fs.mkdirSync(appDir, { recursive: true })
    fs.writeFileSync(path.join(appDir, 'ok.scss'), '.a { color: var(--color-text); }\n')
    fs.writeFileSync(path.join(appDir, 'ok.ts'), "export const a = 'item #1'\n")
    if (scan(tmp).length !== 0) throw new Error('clean tree reported hits')
    fs.writeFileSync(path.join(appDir, 'bad.scss'), '.a { color: #fff; }\n')
    if (scan(tmp).length !== 1) throw new Error('bad .scss not detected')
    fs.writeFileSync(path.join(appDir, 'bad.ts'), "export const c = '#4f46e5'\n")
    if (scan(tmp).length !== 2) throw new Error('bad .ts not detected')
    console.log('check-no-hex self-test ok')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) {
    try {
      selfTest()
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  } else {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const hits = scan(root)
    if (hits.length) {
      console.error('Colour literals are only allowed in src/styles/tokens.scss:')
      for (const hit of hits) console.error(hit)
      process.exit(1)
    }
  }
}
