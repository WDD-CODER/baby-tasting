import path from 'node:path'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createRequireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { requestLogger } from './middleware/request-logger.js'
import { createRepos } from './repositories/index.js'
import { createIndexes } from './repositories/indexes.js'
import { createAllergenStatusRouter } from './routes/allergen-status.js'
import { createAllergensRouter } from './routes/allergens.js'
import { createAuthRouter } from './routes/auth.js'
import { createBabyRouter } from './routes/baby.js'
import { createCalendarRouter } from './routes/calendar.js'
import { createCatalogContext } from './routes/catalog-helpers.js'
import { createFoodsRouter } from './routes/foods.js'
import { healthRouter } from './routes/health.js'
import { createSettingsRouter } from './routes/settings.js'
import { createTestResetRouter } from './routes/test-reset.js'

export function createApp({ config, db }) {
  const app = express()
  const repos = createRepos(db)
  const requireAuth = createRequireAuth({ repos })
  const authConfig = { ...config, appUsers: config.appUsers ?? [] }
  createIndexes(db).catch((err) => console.error('index creation failed', err))

  if (config.nodeEnv === 'production') app.set('trust proxy', 1)
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
  app.use(cookieParser())

  app.use('/api/v1', healthRouter(db))
  app.use('/api/v1', createAuthRouter({ repos, config: authConfig, requireAuth }))
  if (config.e2eReset) app.use('/api/v1', createTestResetRouter({ repos }))
  app.use('/api/v1/baby', requireAuth, createBabyRouter({ repos }))
  const catalogContext = createCatalogContext({ repos })
  const statusRouter = createAllergenStatusRouter({ repos })
  // before the /allergens/:id routes
  app.use(
    ['/api/v1/allergens/status', '/api/v1/allergens/:id/history', '/api/v1/alerts'],
    requireAuth,
    catalogContext,
  )
  app.use('/api/v1', statusRouter)
  app.use('/api/v1/settings', requireAuth, createSettingsRouter({ repos }))
  app.use('/api/v1/allergens', requireAuth, catalogContext, createAllergensRouter({ repos }))
  app.use('/api/v1/foods', requireAuth, catalogContext, createFoodsRouter({ repos }))
  app.use('/api/v1/calendar', requireAuth, catalogContext, createCalendarRouter({ repos }))
  app.use('/api', notFound)

  app.use(express.static(config.staticDir))
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'))
  })

  app.use(errorHandler)
  return app
}
