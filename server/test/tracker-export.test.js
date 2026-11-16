import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import request from 'supertest'
import { buildExportSheets } from '../domain/tracker/export-rows.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx
before(async () => {
  ctx = await startTestApp()
})
after(async () => {
  await ctx.stop()
})

const URL = '/api/v1/tracker/export/xlsx'
const NAMES = { parentAName: 'דנה', parentBName: 'יוסי' }

const binary = (res, cb) => {
  const chunks = []
  res.on('data', (c) => chunks.push(c))
  res.on('end', () => cb(null, Buffer.concat(chunks)))
}

async function readWorkbook(agent, query) {
  const res = await agent.get(`${URL}${query}`).buffer(true).parse(binary)
  assert.equal(res.status, 200)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(res.body)
  return { res, wb }
}

test('the export needs a session', async () => {
  assert.equal((await request(ctx.newApp()).get(URL)).status, 401)
})

test('a bad or reversed range is 400', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  assert.equal((await a.get(`${URL}?from=2026-06-10T00:00:00Z&to=2026-06-11`)).status, 400)
  assert.equal((await a.get(`${URL}?from=2026-06-12&to=2026-06-11`)).status, 400)
})

test('the workbook has the 7 sheets right-to-left, the file name and the latest weigh-in of the day (F11)', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const post = async (body) => assert.equal((await a.post('/api/v1/tracker/events').send(body)).status, 201)
  await post({ eventType: 'WEIGHT', timestamp: '2026-06-10T05:00:00.000Z', weight: { weightGrams: 5000 } })
  await post({ eventType: 'WEIGHT', timestamp: '2026-06-10T15:00:00.000Z', weight: { weightGrams: 5200 } })
  await post({
    eventType: 'NUTRITION',
    timestamp: '2026-06-10T08:00:00.000Z',
    nutrition: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 100, amountConsumedMl: 50 },
  })
  await post({ eventType: 'DIAPER', timestamp: '2026-06-10T09:00:00.000Z', diaper: { contains: 'BOTH' } })
  const { res, wb } = await readWorkbook(a, '?from=2026-06-10&to=2026-06-11')
  assert.match(res.headers['content-disposition'], /^attachment; filename=baby_tracker_report_\d{4}-\d{2}-\d{2}\.xlsx$/)
  assert.deepEqual(
    wb.worksheets.map((w) => w.name),
    [
      'Summary - סיכום יומי',
      'Feeds - האכלות',
      'Sleep - שינה',
      'Diapers - חיתולים',
      'Weight - משקל',
      'Pumping - שאיבות',
      'Vomiting - פליטות',
    ],
  )
  for (const ws of wb.worksheets) assert.equal(ws.views[0].rightToLeft, true, ws.name)
  const summary = wb.getWorksheet('Summary - סיכום יומי')
  assert.equal(summary.rowCount, 3) // header + 2 days, even the empty one
  assert.equal(summary.getRow(2).getCell(1).value, '2026-06-11')
  const day = summary.getRow(3)
  assert.equal(day.getCell(1).value, '2026-06-10')
  assert.equal(day.getCell(10).value, 5200)
  assert.equal(day.getCell(5).value, '50%')
  assert.equal(day.getCell(8).value, 1)
  assert.equal(day.getCell(9).value, 1)
  assert.equal(wb.getWorksheet('Weight - משקל').rowCount, 3)
  assert.equal(wb.getWorksheet('Feeds - האכלות').getRow(2).getCell(3).value, 'תמ״ל (פורמולה)')
})

test('rows use the parents names and the Hebrew value mappings', () => {
  const sheets = buildExportSheets({
    from: '2026-06-10',
    to: '2026-06-10',
    names: NAMES,
    events: [
      {
        eventType: 'SLEEP',
        timestamp: '2026-06-10T10:00:00.000Z',
        loggedBy: 'PARENT_B',
        note: 'x',
        sleep: { startAt: '2026-06-10T10:00:00.000Z', endAt: null, startLocation: 'STROLLER' },
      },
      {
        eventType: 'PUMPING',
        timestamp: '2026-06-10T09:00:00.000Z',
        loggedBy: 'PARENT_A',
        pumping: { leftAmountMl: 30, rightAmountMl: 40 },
      },
    ],
  })
  const sleep = sheets[2].rows[0]
  assert.equal(sleep.loggedBy, 'יוסי')
  assert.equal(sleep.end, 'ישן כעת')
  assert.equal(sleep.durationHours, 'ישן כעת')
  assert.equal(sleep.location, 'עגלה')
  assert.equal(sleep.notes, 'x')
  assert.equal(sheets[5].rows[0].total, 70)
  assert.equal(sheets[5].rows[0].loggedBy, 'דנה')
})
