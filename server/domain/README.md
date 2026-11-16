# server/domain

INV-1: domain rules are pure functions. Files here import no `express`, `mongodb`, `mongoose`, repository
module, and never read the clock (`Date.now()`, `new Date()` without an argument) — the caller passes `now`.
Enforced by `server/test/domain-purity.test.js`.
