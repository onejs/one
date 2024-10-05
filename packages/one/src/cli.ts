import { defineCommand, runMain } from 'citty'
import { loadEnv } from './vite/loadEnv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function getPackageVersion() {
  let dirname
  if (typeof __dirname !== 'undefined') {
    // CommonJS
    dirname = __dirname
  } else {
    // ESM
    dirname = path.dirname(fileURLToPath(import.meta.url))
  }
  const packagePath = path.join(dirname, '..', '..', 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
  return packageJson.version
}

const version = getPackageVersion()

void loadEnv(process.cwd())

const dev = defineCommand({
  meta: {
    name: 'dev',
    version: version,
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
    version: version,
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
    version: version,
    description: 'Serve a built app for production',
  },
  args: {
    host: {
      type: 'string',
    },
    port: {
      type: 'string',
    },
    platform: {
      type: 'string',
    },
    compress: {
      type: 'boolean',
    },
    cacheHeaders: {
      type: 'boolean',
    },
  },
  async run({ args }) {
    const { serve } = await import('./serve')
    await serve({
      port: args.port ? +args.port : undefined,
      host: args.host,
      cacheHeaders: args.cacheHeaders === false ? 'off' : undefined,
      compress: args.compress,
      platform: args.platform === 'vercel' ? 'vercel' : 'node',
    })
  },
})

const prebuild = defineCommand({
  meta: {
    name: 'prebuild',
    version: version,
    description: 'Prebuild native iOS project', // TODO: Android
  },
  args: {},
  async run({ args }) {
    const { run } = await import('./cli/prebuild')
    await run(args)
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
    version: version,
    description: 'Welcome to One',
  },
  args: {},
  async run({ args }) {
    if (['clean', 'prebuild'].includes(args._[0])) {
      // IDK why we're getting into here after a subcommand has been run
      return
    }

    const { cliMain } = await import('./cli/main')
    await cliMain(args)
  },
  subCommands: {
    dev,
    clean,
    build: buildCommand,
    prebuild,
    serve: serveCommand,
  },
})

runMain(main)
