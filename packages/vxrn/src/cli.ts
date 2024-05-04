import { readVXRNConfig } from './utils/readVXRNConfig'
import { defineCommand, runMain } from 'citty'

const dev = defineCommand({
  meta: {
    name: 'dev',
    version: '0.0.0',
    description: 'Start the dev server',
  },
  args: {
    clean: {
      type: 'boolean',
    },
  },
  async run({ args }) {
    const userConfig = await readVXRNConfig()
    const { dev } = await import(
      // @ts-expect-error
      './exports/dev.mjs'
    )
    const { start, stop } = await dev({
      clean: args.clean,
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

const build = defineCommand({
  meta: {
    name: 'build',
    version: '0.0.0',
    description: 'Build your app',
  },
  args: {
    step: {
      type: 'string',
      required: false,
    },
  },
  async run({ args }) {
    const userConfig = await readVXRNConfig()
    const { build } = await import(
      // @ts-expect-error
      './exports/build.mjs'
    )

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const results = await build(userConfig, args)

    if (process.env.DEBUG) {
      console.info('results', results)
    }
  },
})

const serve = defineCommand({
  meta: {
    name: 'serve',
    version: '0.0.0',
    description: 'Serve a built app for production',
  },
  args: {},
  async run({ args }) {
    const userConfig = await readVXRNConfig()
    const { serve } = await import(
      // @ts-expect-error
      './exports/serve.mjs'
    )

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const results = await serve(userConfig)

    if (process.env.DEBUG) {
      console.info('results', results)
    }
  },
})

const main = defineCommand({
  meta: {
    name: 'main',
    version: '0.0.0',
    description: 'Welcome to vxrn',
  },
  subCommands: {
    dev,
    build,
    serve,
  },
})

runMain(main)
