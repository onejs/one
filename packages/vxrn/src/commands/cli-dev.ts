import { defineCommand } from 'citty'
import { readVXRNConfig } from '../utils/readVXRNConfig'
import { create } from '../create'

export default defineCommand({
  meta: {
    name: 'dev',
    version: '0.0.0',
    description: 'Start the dev server',
  },
  args: {},
  async run({ args }) {
    const userConfig = await readVXRNConfig()

    const { start, stop } = await create({
      root: process.cwd(),
      host: '127.0.0.1',
      webConfig: {
        plugins: [],
      },
      buildConfig: {
        plugins: [],
      },
      flow: {
        include: [],
        exclude: [],
      },
      ...userConfig,
    })

    const { closePromise } = await start()

    process.on('beforeExit', () => {
      stop()
    })

    process.on('SIGINT', () => {
      stop()
    })

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    await closePromise
  },
})
