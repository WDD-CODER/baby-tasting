export async function createIndexes(db) {
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true })
  await db.collection('households').createIndex({ key: 1 }, { unique: true })
  await db.collection('babies').createIndex({ householdId: 1 })
  for (const name of ['allergens', 'foods']) {
    await db.collection(name).createIndex({ householdId: 1 })
    await db
      .collection(name)
      .createIndex(
        { householdId: 1, builtInKey: 1 },
        { unique: true, partialFilterExpression: { builtInKey: { $type: 'string' } } },
      )
  }
  await db.collection('calendarItems').createIndex({ householdId: 1, date: 1 })
  await db.collection('calendarItems').createIndex({ householdId: 1, foodId: 1 })
  await db.collection('reactions').createIndex({ householdId: 1, noticedAt: -1 })
  await db.collection('locks').createIndex({ householdId: 1, targetType: 1, targetId: 1 })
  await db.collection('settings').createIndex({ householdId: 1 }, { unique: true })
}
