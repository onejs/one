import { defineCommand, runMain } from 'citty'
import type * as buildExport from './exports/build'
import type * as cleanExport from './exports/clean'
import type * as devExport from './exports/dev'
import type * as patchExport from './exports/patch'
import type * as prebuildExport from './exports/prebuild'
import type * as runAndroidExport from './exports/runAndroid'
import type * as runIOSExport from './exports/runIos'
import type * as serveExport from './exports/serve'

// todo fix this better
async function importCLIEndpoint<T>(path: string): Promise<T> {
  return (await import(path)) as any as T
}

if (typeof import.meta.dirname !== 'string') {
  console.error(`One uses "import.meta.dirname", for Node this is version 20.11.0 or greater`)
  process.exit(1)
}

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
    'debug-bundle': {
      type: 'string',
      description: `Will output the bundle to a temp file and then serve it from there afterwards allowing you to easily edit the bundle to debug problems. Can pass path or empty path for a random directory.`,
    },
  },
  async run({ args }) {
    const { dev } = await importCLIEndpoint<typeof devExport>('./exports/dev.mjs')

    const { start, stop } = await dev({
      clean: args.clean,
      root: process.cwd(),
      debugBundle: args['debug-bundle'] || '',
      server: {
        host: args.host,
        port: args.port ? +args.port : undefined,
      },
    })

    const { closePromise } = await start()

    process.on('beforeExit', () => {
      stop()
    })

    process.on('SIGINT', () => {
      try {
        stop()
      } finally {
        process.exit(2)
      }
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
    platform: {
      type: 'string',
      description: `One of: web, ios, android`,
      default: 'web',
      required: false,
    },
  },
  async run({ args }) {
    const { build } = await importCLIEndpoint<typeof buildExport>('./exports/build.mjs')

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    const platforms = {
      ios: 'ios',
      web: 'web',
      android: 'android',
    } as const

    if (args.platform && !platforms[args.platform]) {
      throw new Error(`Invalid platform: ${args.platform}`)
    }

    const platform = platforms[args.platform as keyof typeof platforms] || 'web'

    const results = await build(
      {},
      {
        analyze: args.analyze,
        only: args.only,
        step: args.step,
        platform,
      }
    )

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
    const { serve } = await importCLIEndpoint<typeof serveExport>('./exports/serve.mjs')

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

const prebuild = defineCommand({
  meta: {
    name: 'prebuild',
    version: '0.0.0',
    description: 'Prebuild native project',
  },
  args: {
    platform: {
      type: 'string',
      description: 'ios or android',
    },
    expo: {
      type: 'boolean',
      description: 'expo or non-expo folders',
      default: true,
    },
    'no-install': {
      type: 'boolean',
      description: 'skip installing native dependencies',
      default: false,
    },
  },
  async run({ args }) {
    if (args.install === false) args['no-install'] = true // citty seems to convert --no-install to install: false, leaving no-install as default

    const { prebuild } = await importCLIEndpoint<typeof prebuildExport>('./exports/prebuild.mjs')
    const root = process.cwd()
    const { platform, expo } = args

    await prebuild({ root, platform, expo })
  },
})

const runIos = defineCommand({
  meta: {
    name: 'run:ios',
    version: '0.0.0',
  },
  args: {},
  async run() {
    const { runIos } = await importCLIEndpoint<typeof runIOSExport>('./exports/runIos.mjs')
    const root = process.cwd()
    await runIos({ root })
  },
})

const runAndroid = defineCommand({
  meta: {
    name: 'run:android',
    version: '0.0.0',
  },
  args: {},
  async run() {
    const { runAndroid } = await importCLIEndpoint<typeof runAndroidExport>(
      './exports/runAndroid.mjs'
    )
    const root = process.cwd()
    await runAndroid({ root })
  },
})

const patch = defineCommand({
  meta: {
    name: 'patch',
    version: '0.0.0',
    description: 'Apply package patches',
  },
  args: {},
  async run() {
    const { patch: vxrnPatch } = await importCLIEndpoint<typeof patchExport>('./exports/patch.mjs')
    await vxrnPatch({
      root: process.cwd(),
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
    const { clean: vxrnClean } = await importCLIEndpoint<typeof cleanExport>('./exports/clean.mjs')
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
    prebuild,
    runIos,
    runAndroid,
    clean,
    patch,
  },
})

runMain(main)
