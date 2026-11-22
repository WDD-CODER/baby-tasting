import { createApp } from './app.js'
import { ConfigError, loadConfig } from './config.js'
import { logger } from './lib/logger.js'
import { connect } from './repositories/db.js'

let config
try {
  config = loadConfig()
} catch (err) {
  if (err instanceof ConfigError) {
    logger.fatal({ event: 'config.invalid' }, err.message)
    process.exit(1)
  }
  throw err
}

const { db } = await connect(config.mongodbUri)

createApp({ config, db }).listen(config.port, () => {
  logger.info({ event: 'server.listening', port: config.port }, 'server listening')
})
