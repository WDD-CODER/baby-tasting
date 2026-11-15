export class HouseholdsRepository {
  constructor(db) {
    this.collection = db.collection('households')
  }

  async ensureDefault(username, now = new Date()) {
    return this.collection.findOneAndUpdate(
      { key: 'default' },
      {
        $addToSet: { members: username },
        $setOnInsert: { key: 'default', createdAt: now },
        $set: { updatedAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    )
  }
}
