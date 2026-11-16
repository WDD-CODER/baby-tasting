import bcrypt from 'bcryptjs'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { createApp } from '../app.js'
import { close, connect } from '../repositories/db.js'

// The test passwords; cost 4 keeps the tests fast.
export const PASSWORDS = { 'parent-a': 'test-pass-a', 'parent-b': 'test-pass-b' }
export const APP_USERS = [
  { username: 'Parent-A', hash: bcrypt.hashSync(PASSWORDS['parent-a'], 4) },
  { username: 'parent-b', hash: bcrypt.hashSync(PASSWORDS['parent-b'], 4) },
]

export async function startTestApp() {
  const mongod = await MongoMemoryServer.create()
  const { db } = await connect(mongod.getUri('test'))
  const config = {
    allowedOrigins: [],
    staticDir: process.cwd(),
    nodeEnv: 'test',
    appUsers: APP_USERS,
    e2eReset: false,
  }
  return {
    db,
    config,
    // a fresh app has a fresh login rate-limit counter
    newApp: (extra = {}) => createApp({ config, db, ...extra }),
    stop: async () => {
      await close()
      await mongod.stop()
    },
  }
}

export async function signedInAgent(app, username = 'parent-a', password = PASSWORDS[username.toLowerCase()]) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send({ username, password })
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`)
  return agent
}
