import { HttpError } from '../lib/http-error.js'
import { logger } from '../lib/logger.js'

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Payload too large' } })
    return
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_json', message: 'Invalid JSON' } })
    return
  }
  const log = req.log ?? logger
  log.error(
    { event: 'http.unhandled', err, path: req.originalUrl?.split('?')[0], householdId: req.householdId },
    'unhandled error',
  )
  res.status(500).json({ error: { code: 'internal', message: 'Internal error', requestId: req.id } })
}
