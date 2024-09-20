import { defineCommand, runMain } from 'citty'
import { loadEnv } from './vite/loadEnv'
import { loadUserVXSOptions } from './vite/vxs'
// import packageJson from 'vxs/package.json' with { type: 'json' }

void loadEnv(process.cwd())

const dev = defineCommand({
  meta: {
    name: 'dev',
    // version: packageJson.version,
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
    const { run } = await import('./cli/run')
    await run(args)
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
  },
  async run({ args }) {
    const { build } = await import('./vite/build')
    await build(args)
    // TODO somewhere just before 1787f241b79 this stopped exiting, must have some hanging task
    process.exit(0)
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
    const { serve } = await import('./serve')
    const { serve: vxrnServe } = await import('vxrn')

    process.on('uncaughtException', (err) => {
      console.error(`[vxs] Uncaught exception`, err?.stack || err)
    })

    const vxsOptions = await loadUserVXSOptions('serve')

    await vxrnServe({
      port: args.port ? +args.port : undefined,
      host: args.host,
      afterServerStart(options, app) {
        serve(vxsOptions, options, app)
      },
    })
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
    const { clean: vxrnClean } = await import('vxrn')
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
  args: {},
  async run({ args }) {
    const { cliMain } = await import('./cli/main')
    await cliMain(args)
  },
  subCommands: {
    dev,
    clean,
    build: buildCommand,
    serve: serveCommand,
  },
})

runMain(main)
