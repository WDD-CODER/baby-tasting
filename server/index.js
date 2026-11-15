import { createApp } from './app.js'
import { ConfigError, loadConfig } from './config.js'
import { connect } from './repositories/db.js'

let config
try {
  config = loadConfig()
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message)
    process.exit(1)
  }
  throw err
}

const { db } = await connect(config.mongodbUri)

createApp({ config, db }).listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`)
})
