import { randomUUID } from 'node:crypto'
import { logger } from '../lib/logger.js'

const VALID_ID = /^[A-Za-z0-9-]{1,64}$/

export function requestLogger(req, res, next) {
  const incoming = req.get('x-request-id')
  req.id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID()
  req.log = logger.child({ requestId: req.id })
  res.setHeader('X-Request-Id', req.id)
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(1))
    const fields = {
      event: 'http.request',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms,
    }
    if (req.householdId) fields.householdId = req.householdId
    req.log[res.statusCode >= 500 ? 'error' : 'info'](fields, 'request')
  })
  next()
}
