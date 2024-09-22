import { defineCommand, runMain } from 'citty'
import type { dev as devFn } from './exports/dev'

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
    host: {
      type: 'string',
    },
    port: {
      type: 'string',
    },
    https: {
      type: 'boolean',
    },
  },
  async run({ args }) {
    const imported = await import(
      // @ts-expect-error
      './exports/dev.mjs'
    )

    // for type safety with our weird import setup
    const dev = imported.dev as typeof devFn

    const { start, stop } = await dev({
      clean: args.clean,
      root: process.cwd(),
      server: {
        https: args.https,
        host: args.host,
        port: args.port ? +args.port : undefined,
      },
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
    // limit the pages built
    only: {
      type: 'string',
      required: false,
    },
    analyze: {
      type: 'boolean',
      required: false,
    },
  },
  async run({ args }) {
    const { build } = await import(
      // @ts-expect-error
      './exports/build.mjs'
    )

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const results = await build({}, args)

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
  args: {
    host: {
      type: 'string',
    },
    port: {
      type: 'string',
    },
  },
  async run({ args }) {
    const { serve } = await import(
      // @ts-expect-error
      './exports/serve.mjs'
    )

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const results = await serve({
      port: args.port ? +args.port : undefined,
      host: args.host,
    })

    if (process.env.DEBUG) {
      console.info('results', results)
    }
  },
})

const clean = defineCommand({
  meta: {
    name: 'clean',
    version: '0.0.0',
    description: 'Clean build folders',
  },
  args: {},
  async run() {
    const { clean: vxrnClean } = await import(
      // @ts-expect-error
      './exports/clean.mjs'
    )
    await vxrnClean({
      root: process.cwd(),
    })
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
    clean,
  },
})

runMain(main)
