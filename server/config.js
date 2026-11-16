import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export class ConfigError extends Error {
  constructor(missing) {
    super(`Missing environment variables: ${missing.join(', ')}`)
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

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const required = ['MONGODB_URI']
  if (nodeEnv === 'production') required.push('SESSION_SECRET', 'APP_USERS')
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

  return {
    port: Number(env.PORT) || 3000,
    nodeEnv,
    mongodbUri: env.MONGODB_URI,
    sessionSecret: env.SESSION_SECRET ?? '',
    appUsers: list(env.APP_USERS),
    allowedOrigins: list(env.ALLOWED_ORIGIN),
    staticDir: env.STATIC_DIR || path.join(repoRoot, 'dist', 'baby-tasting', 'browser'),
    cloudinary,
    e2eReset: env.E2E_RESET === '1' && nodeEnv !== 'production',
  }
}
