import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import {
  TRACKER_DEFAULTS,
  reconcileQuickActionOrder,
  validateTrackerSettings,
  withTrackerDefaults,
} from '../domain/tracker/settings.js'
import { ICON_NAMES, ICON_SLOT_KEYS } from '../domain/tracker/icon-names.js'
import { signedInAgent, startTestApp } from './helpers.js'

test('every slot of the app and a real icon name are accepted as an override', () => {
  const overrides = { 'quick.sleep': 'nightlight', 'location.crib': 'crib', 'card.biogaya': 'water_drop' }
  const check = validateTrackerSettings({ iconOverrides: overrides })
  assert.equal(check.ok, true, JSON.stringify(check.errors))
})

let ctx

before(async () => {
  ctx = await startTestApp()
})

after(async () => {
  await ctx.stop()
})

const DEFAULTS = {
  parentAName: 'אמא',
  parentBName: 'אבא',
  defaultBottleType: 'EXPRESSED_MILK',
  customActivities: ['שגרת בוקר', 'בייבי יוגה', 'שירים', 'טיול בעגלה', 'עיסוי תינוקות'],
  quickActionOrder: ['meal', 'diaper', 'sleep', 'activity', 'weight', 'vomiting'],
  iconOverrides: {},
}

test('GET and PUT tracker settings without a session are 401', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/tracker/settings')).status, 401)
  assert.equal((await request(app).put('/api/v1/tracker/settings').send({ parentAName: 'x' })).status, 401)
})

test('GET returns the defaults of spec-server-data §1.2 and the current parent', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const res = await a.get('/api/v1/tracker/settings')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { settings: DEFAULTS, currentParent: { parentType: 'PARENT_A', parentName: 'אמא' } })
  const b = await signedInAgent(app, 'parent-b')
  const resB = await b.get('/api/v1/tracker/settings')
  assert.deepEqual(resB.body.currentParent, { parentType: 'PARENT_B', parentName: 'אבא' })
})

test('PUT saves names, bottle, activities, order and icon overrides for the household', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const b = await signedInAgent(app, 'parent-b')
  const body = {
    parentAName: ' מאיה ',
    parentBName: 'דן',
    defaultBottleType: 'FORMULA',
    customActivities: ['שירים', 'אמבטיה'],
    quickActionOrder: ['sleep', 'meal', 'diaper', 'activity', 'weight', 'vomiting'],
    iconOverrides: { 'nav.log': 'stylus', 'nav.tasting': 'nutrition' },
  }
  const saved = await a.put('/api/v1/tracker/settings').send(body)
  assert.equal(saved.status, 200)
  assert.deepEqual(saved.body.settings, { ...body, parentAName: 'מאיה' })
  const read = await b.get('/api/v1/tracker/settings')
  assert.deepEqual(read.body.settings, saved.body.settings)
  assert.deepEqual(read.body.currentParent, { parentType: 'PARENT_B', parentName: 'דן' })
  const me = await a.get('/api/v1/auth/me')
  assert.equal(me.body.parentName, 'מאיה')

  // a partial PUT changes only its keys
  const partial = await a.put('/api/v1/tracker/settings').send({ parentBName: 'יואב' })
  assert.equal(partial.body.settings.parentBName, 'יואב')
  assert.equal(partial.body.settings.defaultBottleType, 'FORMULA')

  // the Tasting rule values are untouched and still saved beside them
  const rules = await a.put('/api/v1/settings').send({ introDays: 4 })
  assert.equal(rules.status, 200)
  assert.equal((await a.get('/api/v1/tracker/settings')).body.settings.parentBName, 'יואב')
  assert.equal((await a.get('/api/v1/settings')).body.settings.introDays, 4)
})

test('PUT refuses an unknown slot key, an unknown icon name and other bad values with 400', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app)
  const before = (await a.get('/api/v1/tracker/settings')).body.settings
  const cases = [
    { iconOverrides: { 'nav.nope': 'settings' } },
    { iconOverrides: { 'nav.log': 'not_an_icon_name' } },
    { iconOverrides: { 'nav.log': 5 } },
    { iconOverrides: ['settings'] },
    { parentAName: '   ' },
    { parentAName: 'x'.repeat(41) },
    { defaultBottleType: 'JUICE' },
    { customActivities: 'שירים' },
    { customActivities: [''] },
    { quickActionOrder: ['meal', 'meal'] },
    { quickActionOrder: ['dance'] },
    { unknownKey: 1 },
    [],
  ]
  for (const body of cases) {
    const res = await a.put('/api/v1/tracker/settings').send(body)
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(res.body.error.code, 'invalid')
  }
  assert.deepEqual((await a.get('/api/v1/tracker/settings')).body.settings, before)
})

test('domain: defaults, validation and order reconcile are pure', () => {
  assert.deepEqual(withTrackerDefaults(undefined), DEFAULTS)
  assert.deepEqual(withTrackerDefaults({ parentAName: '', defaultBottleType: 'X' }), DEFAULTS)
  assert.equal(TRACKER_DEFAULTS.parentAName, 'אמא')
  assert.deepEqual(reconcileQuickActionOrder(['weight', 'dance', 'weight']), [
    'weight',
    'meal',
    'diaper',
    'sleep',
    'activity',
    'vomiting',
  ])
  assert.equal(validateTrackerSettings({ iconOverrides: { 'nav.settings': 'tune' } }).ok, true)
  assert.equal(validateTrackerSettings(null).ok, false)
})

test('the generated icon list holds the library names and the navigation slots', () => {
  assert.ok(ICON_NAMES.size > 3000)
  for (const name of ['edit_note', 'timeline', 'monitoring', 'restaurant', 'settings']) assert.ok(ICON_NAMES.has(name), name)
  for (const slot of ['nav.log', 'nav.timeline', 'nav.stats', 'nav.tasting', 'nav.settings']) {
    assert.ok(ICON_SLOT_KEYS.has(slot), slot)
  }
})
