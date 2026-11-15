import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { createApp } from '../app.js'
import { close, connect } from '../repositories/db.js'

export const APP_USERS = ['Parent-A', 'parent-b']

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

export async function signedInAgent(app, username = 'parent-a') {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send({ username })
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`)
  return agent
}
