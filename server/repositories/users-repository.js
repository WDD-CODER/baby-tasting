// Accounts of db mode: { username, usernameLower, passwordHash, parentType, createdAt }.
// The unique parentType index is the real two-user limit.
export class UsersRepository {
  constructor(db) {
    this.collection = db.collection('users')
  }

  findAll() {
    return this.collection.find({}).toArray()
  }

  findByName(username) {
    return this.collection.findOne({ usernameLower: String(username).trim().toLowerCase() })
  }

  async create({ username, passwordHash, parentType, now = new Date() }) {
    const doc = { username, usernameLower: username.toLowerCase(), passwordHash, parentType, createdAt: now }
    const { insertedId } = await this.collection.insertOne(doc)
    return { ...doc, _id: insertedId }
  }

  // Returns the deleted document, or null.
  async deleteByParentType(parentType) {
    return this.collection.findOneAndDelete({ parentType })
  }
}
