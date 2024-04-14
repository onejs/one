import { defineCommand } from 'citty'
import { build } from '../build'
import { readVXRNConfig } from '../utils/readVXRNConfig'

export default defineCommand({
  meta: {
    name: 'build',
    version: '0.0.0',
    description: 'Build your app',
  },
  args: {},
  async run({ args }) {
    const userConfig = await readVXRNConfig()

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const results = await build(userConfig)

    if (process.env.DEBUG) {
      console.info('results', results)
    }
  },
})
