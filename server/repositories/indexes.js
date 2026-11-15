export async function createIndexes(db) {
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true })
  await db.collection('households').createIndex({ key: 1 }, { unique: true })
  await db.collection('babies').createIndex({ householdId: 1 })
}
