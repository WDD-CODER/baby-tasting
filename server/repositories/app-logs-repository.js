// Warnings and errors kept 30 days (TTL index on `at`). Not household data; no route reads it.
import { withCreateAudit } from '../lib/audit.js'

export class AppLogsRepository {
  constructor(db) {
    this.collection = db.collection('app_logs')
  }

  async write(entry) {
    const doc = { ...entry, message: String(entry.message ?? '').slice(0, 500) }
    await this.collection.insertOne(withCreateAudit(doc, 'system'))
  }

  query({ since, level, requestId, limit = 50 } = {}) {
    const filter = {}
    if (since) filter.at = { $gte: since }
    if (level === 'error') filter.level = 'error'
    else if (level === 'warn') filter.level = { $in: ['warn', 'error'] }
    if (requestId) {
      const safe = requestId.replace(/[^A-Za-z0-9-]/g, '')
      filter.requestId = safe.length === 8 ? { $regex: `^${safe}` } : safe
    }
    return this.collection
      .find(filter)
      .sort({ at: -1 })
      .limit(Math.min(Number(limit) || 50, 500))
      .toArray()
  }
}
