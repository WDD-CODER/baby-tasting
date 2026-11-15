import { MongoClient } from 'mongodb'

let current = null

export async function connect(uri) {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  current = { client, db }
  return current
}

export async function close() {
  if (current) {
    await current.client.close()
    current = null
  }
}
