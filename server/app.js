import path from 'node:path'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { attachSink, logger } from './lib/logger.js'
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
import { createTrackerExportRouter } from './routes/tracker-export.js'
import { createTrackerEventsRouter } from './routes/tracker-events.js'
import { createTrackerSettingsRouter } from './routes/tracker-settings.js'
import { createTrackerSleepRouter } from './routes/tracker-sleep.js'
import { createTrackerStatsRouter } from './routes/tracker-stats.js'

const HASHED_FILE = /-[A-Za-z0-9_-]{6,}\.(js|css)$/
const REVALIDATE_FILES = new Set([
  'index.html',
  'manifest.webmanifest',
  'ngsw.json',
  'ngsw-worker.js',
  'safety-worker.js',
  'worker-basic.min.js',
])

// built files with a hash in the name never change; the page itself and the worker files are always re-checked
function setStaticHeaders(res, filePath) {
  const name = path.basename(filePath)
  const inMedia = filePath.split(/[\\/]/).includes('media')
  if (REVALIDATE_FILES.has(name)) res.setHeader('Cache-Control', 'no-cache')
  else if (HASHED_FILE.test(name) || inMedia) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
}

export function createApp({ config, db, photoStore = createPhotoStore(config.cloudinary ?? null) }) {
  const app = express()
  const repos = createRepos(db)
  const appUsers = config.appUsers ?? []
  const authConfig = { ...config, appUsers, accountsMode: appUsers.length ? 'env' : 'db' }
  const requireAuth = createRequireAuth({ repos, config: authConfig })
  attachSink((rec) =>
    repos.appLogs.write({
      at: new Date(rec.time),
      level: rec.levelName === 'warn' ? 'warn' : 'error',
      event: rec.event ?? 'log',
      message: rec.msg ?? '',
      requestId: rec.requestId ?? null,
      householdId: rec.householdId ?? null,
      path: rec.path ?? null,
      status: rec.status ?? null,
      err: rec.err ? { name: rec.err.type ?? 'Error', message: rec.err.message ?? '' } : null,
    }),
  )
  createIndexes(db).catch((err) => logger.error({ event: 'indexes.failed', err }, 'index creation failed'))

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
  app.use(compression())
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
  app.use('/api/v1/tracker/export', requireAuth, createTrackerExportRouter({ repos }))
  app.use('/api/v1/tracker/sleep', requireAuth, createTrackerSleepRouter({ repos }))
  app.use('/api/v1/tracker/stats', requireAuth, createTrackerStatsRouter({ repos }))
  app.use('/api/v1/allergens', requireAuth, catalogContext, createAllergensRouter({ repos }))
  app.use('/api/v1/foods', requireAuth, catalogContext, createFoodsRouter({ repos }))
  app.use('/api/v1/calendar', requireAuth, catalogContext, createCalendarRouter({ repos }))
  app.use('/api/v1/suggestions', requireAuth, catalogContext, createSuggestionsRouter({ repos }))
  app.use('/api/v1/uploads', requireAuth, createUploadsRouter({ photoStore }))
  app.use('/api/v1/reactions', requireAuth, catalogContext, createReactionsRouter({ repos, photoStore }))
  app.use('/api', notFound)

  // the service worker files must always be revalidated, or an update never reaches the phone
  app.use(['/ngsw-worker.js', '/ngsw.json', '/safety-worker.js', '/worker-basic.min.js'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache')
    next()
  })
  app.use(express.static(config.staticDir, { setHeaders: setStaticHeaders }))
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(config.staticDir, 'index.html'))
  })

  app.use(errorHandler)
  return app
}
