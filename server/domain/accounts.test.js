import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideSignup, firstAccountOpen, INVITE_TTL_MS, inviteExpiry, validateCredentials } from './accounts.js'

const A = { parentType: 'PARENT_A' }
const B = { parentType: 'PARENT_B' }

test('the first account is open and becomes PARENT_A, with no invite', () => {
  assert.deepEqual(decideSignup({ users: [], inviteProvided: false }), {
    ok: true,
    parentType: 'PARENT_A',
    needsInvite: false,
  })
})

test('the first account is open again when only PARENT_B is left', () => {
  assert.equal(decideSignup({ users: [B], inviteProvided: false }).parentType, 'PARENT_A')
})

test('the second account needs an invite and becomes PARENT_B', () => {
  assert.deepEqual(decideSignup({ users: [A], inviteProvided: false }), { ok: false, status: 403, code: 'invite_required' })
  assert.deepEqual(decideSignup({ users: [A], inviteProvided: true }), { ok: true, parentType: 'PARENT_B', needsInvite: true })
})

test('with both parents sign-up is closed', () => {
  assert.deepEqual(decideSignup({ users: [A, B], inviteProvided: true }), { ok: false, status: 409, code: 'signup_closed' })
})

test('firstAccountOpen is db mode with no PARENT_A', () => {
  assert.equal(firstAccountOpen({ mode: 'db', users: [] }), true)
  assert.equal(firstAccountOpen({ mode: 'db', users: [A] }), false)
  assert.equal(firstAccountOpen({ mode: 'env', users: [] }), false)
})

test('username rules: trimmed, 2-30, letters (Hebrew or Latin), digits, - and _', () => {
  assert.equal(validateCredentials({ username: '  דן-1_x ', password: 'abcd' }).username, 'דן-1_x')
  for (const username of ['a', 'a'.repeat(31), 'a b', 'a!', '', 5, undefined]) {
    const r = validateCredentials({ username, password: 'abcd' })
    assert.equal(r.ok, false)
    assert.equal(r.errors[0].field, 'username')
  }
})

test('password rules: 4 to 200 characters', () => {
  assert.equal(validateCredentials({ username: 'dad', password: 'abcd' }).ok, true)
  assert.equal(validateCredentials({ username: 'dad', password: 'a'.repeat(200) }).ok, true)
  for (const password of ['abc', 'a'.repeat(201), '', 5, undefined]) {
    const r = validateCredentials({ username: 'dad', password })
    assert.equal(r.ok, false)
    assert.equal(r.errors[0].field, 'password')
  }
})

test('an invite lasts 7 days', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  assert.equal(inviteExpiry(now).getTime() - now.getTime(), INVITE_TTL_MS)
  assert.equal(INVITE_TTL_MS, 7 * 24 * 60 * 60 * 1000)
})
