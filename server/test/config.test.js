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
  const config = loadConfig({
    MONGODB_URI: 'mongodb://x/y',
    APP_USERS: 'a:$2b$10$hashA, b : $2b$10$hashB',
    ALLOWED_ORIGIN: 'http://localhost:4200',
  })
  assert.equal(config.port, 3000)
  assert.deepEqual(config.appUsers, [
    { username: 'a', hash: '$2b$10$hashA' },
    { username: 'b', hash: '$2b$10$hashB' },
  ])
  assert.deepEqual(config.allowedOrigins, ['http://localhost:4200'])
  assert.equal(config.cloudinary, null)
})

test('an APP_USERS name without :hash is refused with a clear config error', () => {
  for (const value of ['parent-a,parent-b', 'parent-a:$2b$10$x,parent-b', 'parent-a:']) {
    assert.throws(
      () => loadConfig({ MONGODB_URI: 'mongodb://x/y', APP_USERS: value }),
      (err) => err instanceof ConfigError && /APP_USERS/.test(err.message) && /name:bcryptHash/.test(err.message),
    )
  }
})
