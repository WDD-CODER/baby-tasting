import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import { connect, close } from '../repositories/db.js'

let mongod
let server
let base
let staticDir

before(async () => {
  mongod = await MongoMemoryServer.create()
  const { db } = await connect(mongod.getUri('test'))
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-static-'))
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<html>spa-index</html>')
  const config = { allowedOrigins: [], staticDir }
  server = createApp({ config, db }).listen(0)
  base = `http://localhost:${server.address().port}`
})

after(async () => {
  server?.close()
  await close()
  await mongod?.stop()
  fs.rmSync(staticDir, { recursive: true, force: true })
})

test('INV-4: unknown /api/v1 path returns the JSON error shape', async () => {
  const res = await fetch(`${base}/api/v1/x`)
  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.error.code, 'not_found')
})

test('a page path serves index.html of the static folder', async () => {
  const res = await fetch(`${base}/some/page`)
  assert.equal(res.status, 200)
  assert.match(await res.text(), /spa-index/)
})

test('a built script is compressed and cached for a year', async () => {
  fs.writeFileSync(path.join(staticDir, 'main-ABCD1234.js'), 'console.log("hello world");\n'.repeat(500))
  const res = await fetch(`${base}/main-ABCD1234.js`, { headers: { 'accept-encoding': 'gzip' } })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-encoding'), 'gzip')
  assert.match(res.headers.get('cache-control'), /immutable/)
})

test('the page and the worker manifest are always re-checked', async () => {
  fs.writeFileSync(path.join(staticDir, 'ngsw.json'), '{}')
  for (const url of ['/', '/index.html', '/ngsw.json', '/some/page']) {
    const res = await fetch(`${base}${url}`)
    assert.equal(res.headers.get('cache-control'), 'no-cache', url)
  }
})

test('health reports the database', async () => {
  const res = await fetch(`${base}/api/v1/health`)
  assert.deepEqual(await res.json(), { status: 'ok', db: 'up' })
})
