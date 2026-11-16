import { HttpError } from '../lib/http-error.js'

export function notFound(req, _res, next) {
  next(new HttpError(404, 'not_found', `No route for ${req.method} ${req.originalUrl}`))
}
