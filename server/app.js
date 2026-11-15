import path from 'node:path'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { requestLogger } from './middleware/request-logger.js'
import { healthRouter } from './routes/health.js'

export function createApp({ config, db }) {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestLogger)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          upgradeInsecureRequests: null,
        },
      },
    }),
  )
  if (config.allowedOrigins.length) {
    app.use(cors({ origin: config.allowedOrigins, credentials: true }))
  }
  app.use(express.json({ limit: '100kb' }))

  app.use('/api/v1', healthRouter(db))
  app.use('/api', notFound)

  app.use(express.static(config.staticDir))
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'))
  })

  app.use(errorHandler)
  return app
}
