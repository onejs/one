import { defineCommand, runMain } from 'citty'
import { build, serve } from './vite'
import { virtualEntryIdNative } from './vite/virtualEntryPlugin'

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
  },
  async run({ args }) {
    const { dev } = await import('vxrn')
    const { start, stop } = await dev({
      clean: args.clean,
      root: process.cwd(),
      host: args.host,
      port: args.port ? +args.port : undefined,
      entries: {
        native: virtualEntryIdNative,
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

const buildCommand = defineCommand({
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
    const { build: vxrnBuild } = await import('vxrn')

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const outputInfo = await vxrnBuild({}, args)

    await build(outputInfo)
  },
})

const serveCommand = defineCommand({
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
    const { serve: vxrnServe } = await import('vxrn')

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    await vxrnServe({
      port: args.port ? +args.port : undefined,
      host: args.host,
      onServe(options, app) {
        serve(options, app)
      },
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
    build: buildCommand,
    serve: serveCommand,
  },
})

runMain(main)
