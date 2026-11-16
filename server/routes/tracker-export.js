import { Router } from 'express'
import { isDateString, jerusalemMidnight } from '../domain/tracker/baby-day.js'
import { toApiEvent } from '../domain/tracker/events.js'
import { buildExportSheets, israelDate } from '../domain/tracker/export-rows.js'
import { withTrackerDefaults } from '../domain/tracker/settings.js'
import { datesInRange } from '../domain/tracker/stats.js'
import { HttpError } from '../lib/http-error.js'
import { buildWorkbook } from '../lib/tracker-export.js'
import { handle } from './catalog-helpers.js'

const MAX_DAYS = 366
const EVENT_LIMIT = 20000
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function parseDay(value, name, fallback) {
  if (value === undefined || value === '') return fallback
  if (!isDateString(value)) throw new HttpError(400, 'invalid', `${name} must be a YYYY-MM-DD date`)
  return value
}

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d + n))
  const pad = (v) => String(v).padStart(2, '0')
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`
}

// GET /api/v1/tracker/export/xlsx?from&to (Israel days, default the last 14 days)
export function createTrackerExportRouter({ repos }) {
  const router = Router()

  router.get(
    '/xlsx',
    handle(async (req, res) => {
      const now = new Date()
      const today = israelDate(now.toISOString())
      const from = parseDay(req.query.from, 'from', addDays(today, -14))
      const to = parseDay(req.query.to, 'to', today)
      if (to < from) throw new HttpError(400, 'invalid', 'to must not be before from')
      if (datesInRange(from, to).length > MAX_DAYS) {
        throw new HttpError(400, 'invalid', `the range is at most ${MAX_DAYS} days`)
      }
      const [docs, stored] = await Promise.all([
        repos.trackerEvents.list(req.householdId, {
          from: jerusalemMidnight(from, 0),
          to: jerusalemMidnight(to, 1),
          limit: EVENT_LIMIT,
        }),
        repos.settings.getTracker(req.householdId),
      ])
      const names = withTrackerDefaults(stored)
      const sheets = buildExportSheets({ events: docs.map(toApiEvent), from, to, names })
      const workbook = buildWorkbook(sheets, now)
      res.setHeader('Content-Type', XLSX)
      res.setHeader('Content-Disposition', `attachment; filename=baby_tracker_report_${today}.xlsx`)
      await workbook.xlsx.write(res)
      res.end()
    }),
  )

  return router
}
