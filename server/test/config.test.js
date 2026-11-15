import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConfigError, loadConfig } from '../config.js'

test('missing MONGODB_URI throws a message naming it', () => {
  assert.throws(() => loadConfig({}), (err) => err instanceof ConfigError && err.message.includes('MONGODB_URI'))
})

test('production also requires SESSION_SECRET and APP_USERS', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://x/y' }),
    (err) => err.message.includes('SESSION_SECRET') && err.message.includes('APP_USERS'),
  )
})

test('development config parses lists and defaults', () => {
  const config = loadConfig({ MONGODB_URI: 'mongodb://x/y', APP_USERS: 'a, b', ALLOWED_ORIGIN: 'http://localhost:4200' })
  assert.equal(config.port, 3000)
  assert.deepEqual(config.appUsers, ['a', 'b'])
  assert.deepEqual(config.allowedOrigins, ['http://localhost:4200'])
  assert.equal(config.cloudinary, null)
})
