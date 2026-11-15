import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function jsFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return jsFiles(full)
    return entry.name.endsWith('.js') ? [full] : []
  })
}

const rel = (file) => path.relative(serverDir, file)

test('INV-1: server/domain imports no framework, driver, repository or clock', () => {
  const banned = [
    /from\s+['"]express['"]/,
    /from\s+['"]mongodb['"]/,
    /from\s+['"]mongoose['"]/,
    /from\s+['"][^'"]*repositories/,
    /Date\.now\s*\(/,
    /new Date\s*\(\s*\)/,
  ]
  for (const file of jsFiles(path.join(serverDir, 'domain'))) {
    const text = fs.readFileSync(file, 'utf8')
    for (const re of banned) assert.ok(!re.test(text), `${rel(file)} matches ${re}`)
  }
})

test('INV-2: routes and middleware never import the mongodb driver', () => {
  const files = [...jsFiles(path.join(serverDir, 'routes')), ...jsFiles(path.join(serverDir, 'middleware'))]
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    assert.ok(!/from\s+['"]mongodb['"]|require\(\s*['"]mongodb['"]/.test(text), `${rel(file)} imports mongodb`)
  }
})
