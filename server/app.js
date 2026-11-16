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
import { createActivityRouter } from './routes/activity.js'
import { createAllergensRouter } from './routes/allergens.js'
import { createAuthRouter } from './routes/auth.js'
import { createBabyRouter } from './routes/baby.js'
import { createCalendarRouter } from './routes/calendar.js'
import { createCatalogContext } from './routes/catalog-helpers.js'
import { createFoodsRouter } from './routes/foods.js'
import { healthRouter } from './routes/health.js'
import { createPhotoStore } from './lib/cloudinary.js'
import { createProgressRouter } from './routes/progress.js'
import { createReactionsRouter } from './routes/reactions.js'
import { createUploadsRouter } from './routes/uploads.js'
import { createUsersRouter } from './routes/users.js'
import { createSettingsRouter } from './routes/settings.js'
import { createSuggestionsRouter } from './routes/suggestions.js'
import { createTestResetRouter } from './routes/test-reset.js'
import { createTrackerEventsRouter } from './routes/tracker-events.js'
import { createTrackerSettingsRouter } from './routes/tracker-settings.js'
import { createTrackerSleepRouter } from './routes/tracker-sleep.js'

export function createApp({ config, db, photoStore = createPhotoStore(config.cloudinary ?? null) }) {
  const app = express()
  const repos = createRepos(db)
  const authConfig = { ...config, appUsers: config.appUsers ?? [] }
  const requireAuth = createRequireAuth({ repos, config: authConfig })
  createIndexes(db).catch((err) => console.error('index creation failed', err))

  if (config.nodeEnv === 'production') app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(requestLogger)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'", 'https://api.cloudinary.com'],
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
  app.use('/api/v1/progress', requireAuth, catalogContext, createProgressRouter({ repos }))
  app.use('/api/v1/activity', requireAuth, createActivityRouter({ repos }))
  app.use('/api/v1/users', requireAuth, createUsersRouter({ repos }))
  app.use('/api/v1/settings', requireAuth, createSettingsRouter({ repos }))
  app.use('/api/v1/tracker/settings', requireAuth, createTrackerSettingsRouter({ repos }))
  app.use('/api/v1/tracker/events', requireAuth, createTrackerEventsRouter({ repos }))
  app.use('/api/v1/tracker/sleep', requireAuth, createTrackerSleepRouter({ repos }))
  app.use('/api/v1/allergens', requireAuth, catalogContext, createAllergensRouter({ repos }))
  app.use('/api/v1/foods', requireAuth, catalogContext, createFoodsRouter({ repos }))
  app.use('/api/v1/calendar', requireAuth, catalogContext, createCalendarRouter({ repos }))
  app.use('/api/v1/suggestions', requireAuth, catalogContext, createSuggestionsRouter({ repos }))
  app.use('/api/v1/uploads', requireAuth, createUploadsRouter({ photoStore }))
  app.use('/api/v1/reactions', requireAuth, catalogContext, createReactionsRouter({ repos, photoStore }))
  app.use('/api', notFound)

  app.use(express.static(config.staticDir))
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'))
  })

  app.use(errorHandler)
  return app
}
