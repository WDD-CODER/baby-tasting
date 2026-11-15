export class TestResetRepository {
  constructor(db) {
    this.db = db
  }

  async clearAll() {
    const collections = await this.db.listCollections({}, { nameOnly: true }).toArray()
    for (const { name } of collections) {
      if (name.startsWith('system.')) continue
      await this.db.collection(name).deleteMany({})
    }
  }
}
