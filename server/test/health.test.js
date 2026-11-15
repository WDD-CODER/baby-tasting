import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

test('GET /api/v1/health returns status ok', async () => {
  const server = createApp().listen(0)
  try {
    const { port } = server.address()
    const res = await fetch(`http://localhost:${port}/api/v1/health`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: 'ok' })
  } finally {
    server.close()
  }
})
