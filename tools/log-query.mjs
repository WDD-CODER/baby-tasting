// Reads the Mongo `app_logs` collection (warn and error records kept 30 days).
// Usage: node tools/log-query.mjs [--since <ISO|30m|2h|1d>] [--level warn|error] [--request <id or first 8 chars>] [--limit n]
// The database address comes from MONGODB_URI (environment, else server/.env) and is never printed.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseSince(text, now = Date.now()) {
  const m = /^(\d+)([mhd])$/.exec(text)
  if (m) return new Date(now - Number(m[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[m[2]])
  const d = new Date(text)
  if (Number.isNaN(d.getTime())) throw new Error(`bad --since: ${text}`)
  return d
}

function readUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  const file = path.join(ROOT, 'server', '.env')
  if (!fs.existsSync(file)) return ''
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='))
  return line ? line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '') : ''
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const uri = readUri()
  if (!uri) {
    console.log('SKIP: no database configured')
    return
  }
  const level = arg('level')
  if (level && !['warn', 'error'].includes(level)) throw new Error('--level is warn or error')
  const requireServer = createRequire(path.join(ROOT, 'server', 'package.json'))
  const { MongoClient } = requireServer('mongodb')
  const { AppLogsRepository } = await import('../server/repositories/app-logs-repository.js')
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const repo = new AppLogsRepository(client.db())
    const rows = await repo.query({
      since: parseSince(arg('since') ?? '1h'),
      level,
      requestId: arg('request'),
      limit: arg('limit') ?? 50,
    })
    for (const r of rows) {
      const err = r.err ? ` ${r.err.name}: ${r.err.message}` : ''
      console.log(
        `${r.at.toISOString()} ${r.level} ${r.event} req=${r.requestId ?? '-'} ${r.path ?? ''} ${r.status ?? ''} ${r.message}${err}`.trim(),
      )
    }
    console.log(`${rows.length} entries`)
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(`log-query: ${err.message}`)
  process.exit(1)
})
