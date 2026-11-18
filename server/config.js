import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export class ConfigError extends Error {
  constructor(missing, message) {
    super(message ?? `Missing environment variables: ${missing.join(', ')}`)
    this.name = 'ConfigError'
    this.missing = missing
  }
}

function list(value) {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// APP_USERS is "name:bcryptHash,name:bcryptHash" (a bcrypt hash holds no ':' or ',').
// The first entry is PARENT_A, the second PARENT_B.
export function parseAppUsers(value) {
  return list(value).map((entry) => {
    const at = entry.indexOf(':')
    const username = (at === -1 ? entry : entry.slice(0, at)).trim()
    const hash = at === -1 ? '' : entry.slice(at + 1).trim()
    if (!username || !hash) {
      throw new ConfigError(
        ['APP_USERS'],
        `APP_USERS entry "${username}" has no password hash: write it as name:bcryptHash (see server/.env.example)`,
      )
    }
    return { username, hash }
  })
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const required = ['MONGODB_URI']
  if (nodeEnv === 'production') required.push('SESSION_SECRET')
  const missing = required.filter((key) => !env[key] || !env[key].trim())
  if (missing.length) throw new ConfigError(missing)

  const cloudinary =
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
      ? {
          cloudName: env.CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
          apiSecret: env.CLOUDINARY_API_SECRET,
        }
      : null

  const appUsers = parseAppUsers(env.APP_USERS)

  return {
    port: Number(env.PORT) || 3000,
    nodeEnv,
    mongodbUri: env.MONGODB_URI,
    sessionSecret: env.SESSION_SECRET ?? '',
    appUsers,
    // env: APP_USERS is the account list and sign-up is off; db: accounts live in the users collection
    accountsMode: appUsers.length ? 'env' : 'db',
    allowedOrigins: list(env.ALLOWED_ORIGIN),
    staticDir: env.STATIC_DIR || path.join(repoRoot, 'dist', 'baby-tasting', 'browser'),
    cloudinary,
    e2eReset: env.E2E_RESET === '1' && nodeEnv !== 'production',
  }
}
