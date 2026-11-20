import pino from 'pino'

const LEVELS = { 10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' }
const RANK = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }

function pickLevel() {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL
  if (process.execArgv.includes('--test') || process.env.NODE_TEST_CONTEXT) return 'silent'
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

let sink = null
let sinkMin = RANK.warn

// A stream that hands each finished record to the sink; it never blocks and never throws into a request.
const sinkStream = {
  write(line) {
    if (!sink) return
    try {
      const rec = JSON.parse(line)
      if (rec.level < sinkMin) return
      Promise.resolve(sink({ ...rec, levelName: LEVELS[rec.level] })).catch(() => {})
    } catch {
      // a failed log write is dropped on purpose
    }
  },
}

export const logger = pino(
  {
    level: pickLevel(),
    redact: { paths: ['*.password', '*.token', '*.cookie', '*.authorization'], censor: '[redacted]' },
  },
  pino.multistream([{ stream: process.stdout }, { stream: sinkStream }]),
)

/** Sends records at `minLevel` (default warn) and above to `write(record)`; pass null to detach. */
export function attachSink(write, minLevel = 'warn') {
  sink = write
  sinkMin = RANK[minLevel] ?? RANK.warn
}
