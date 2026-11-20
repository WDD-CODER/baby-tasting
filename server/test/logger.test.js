import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import request from 'supertest'

// the logger reads its level when first imported
process.env.LOG_LEVEL = 'debug'
const { attachSink } = await import('../lib/logger.js')
const { startTestApp } = await import('./helpers.js')

describe('logging', () => {
  let ctx
  let app
  const records = []

  before(async () => {
    ctx = await startTestApp()
    app = ctx.newApp()
    attachSink((rec) => {
      records.push(rec)
    }, 'info')
  })
  after(() => ctx.stop())

  it('answers with an X-Request-Id: the sent one when valid, a new one otherwise', async () => {
    const a = await request(app).get('/api/v1/health').set('X-Request-Id', 'abc-123')
    assert.equal(a.headers['x-request-id'], 'abc-123')
    const b = await request(app).get('/api/v1/health').set('X-Request-Id', 'bad id!')
    assert.notEqual(b.headers['x-request-id'], 'bad id!')
    assert.match(b.headers['x-request-id'], /^[A-Za-z0-9-]{1,64}$/)
  })

  it('a throwing route answers 500 with the requestId and logs http.unhandled', async () => {
    // routes added after createApp sit behind the static handler, so mount through a wrapper app
    const express = (await import('express')).default
    const { requestLogger } = await import('../middleware/request-logger.js')
    const { errorHandler } = await import('../middleware/error-handler.js')
    const wrapper = express()
    wrapper.use(requestLogger)
    wrapper.get('/api/v1/boom', () => {
      throw new Error('boom')
    })
    wrapper.use(errorHandler)
    const res = await request(wrapper).get('/api/v1/boom')
    assert.equal(res.status, 500)
    assert.equal(res.body.error.requestId, res.headers['x-request-id'])
    const rec = records.find((r) => r.event === 'http.unhandled' && r.requestId === res.body.error.requestId)
    assert.ok(rec)
    assert.equal(rec.levelName, 'error')
  })

  it('a Cookie header never reaches a record; http.request has no username', async () => {
    const before = records.length
    await request(app).get('/api/v1/health').set('Cookie', 'session=secret-cookie-value')
    const fresh = records.slice(before)
    assert.ok(fresh.some((r) => r.event === 'http.request'))
    assert.ok(!JSON.stringify(fresh).includes('secret-cookie-value'))
    assert.ok(fresh.every((r) => !('username' in r)))
  })

  it('an error record lands in app_logs', async () => {
    const wrapper = (await import('express')).default()
    const { requestLogger } = await import('../middleware/request-logger.js')
    const { errorHandler } = await import('../middleware/error-handler.js')
    wrapper.use(requestLogger)
    wrapper.get('/boom2', () => {
      throw new Error('boom2')
    })
    wrapper.use(errorHandler)
    // createApp attached the repository sink to the module logger; re-create the app to point it at this db
    ctx.newApp()
    const res = await request(wrapper).get('/boom2')
    const id = res.body.error.requestId
    let row = null
    for (let i = 0; i < 40 && !row; i++) {
      row = await ctx.db.collection('app_logs').findOne({ requestId: id, event: 'http.unhandled' })
      if (!row) await new Promise((r) => setTimeout(r, 50))
    }
    assert.ok(row)
    assert.equal(row.level, 'error')
    assert.ok(row.at instanceof Date)
  })
})
