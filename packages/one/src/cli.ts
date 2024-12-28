import { defineCommand, runMain, showUsage } from 'citty'
import colors from 'picocolors'
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

if (path.sep !== '/') {
  console.warn(
    colors.bgYellow('WARNING: UNSUPPORTED OS') +
      colors.yellow(
        ' - It appears you’re using Windows, which is currently not supported. You may experience unexpected issues.'
      )
  )
}

const modes = {
  development: 'development',
  production: 'production',
} as const

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
    mode: {
      type: 'string',
      description:
        'If set to "production" you can run the development server but serve the production bundle',
    },
    'debug-bundle': {
      type: 'boolean',
      description: `Will output the bundle to a temp file and then serve it from there afterwards allowing you to easily edit the bundle to debug problems.`,
    },
    debug: {
      type: 'string',
      description: `Pass debug args to Vite`,
    },
  },
  async run({ args }) {
    const { run } = await import('./cli/run')
    await run({
      ...args,
      debugBundle: !!args['debug-bundle'],
      mode: modes[args.mode],
    })
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
    const { build } = await import('./cli/build')
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
    loadEnv: {
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
      loadEnv: !!args.loadEnv,
    })
  },
})

const prebuild = defineCommand({
  meta: {
    name: 'prebuild',
    version: version,
    description: 'Prebuild native project',
  },
  args: {
    platform: {
      type: 'string',
      description: 'ios or android',
    },
  },
  async run({ args }) {
    const { run } = await import('./cli/prebuild')
    await run(args)
  },
})

const runIos = defineCommand({
  meta: {
    name: 'run:ios',
    version: version,
  },
  args: {},
  async run({ args }) {
    const { run } = await import('./cli/runIos')
    await run(args)
  },
})

const runAndroid = defineCommand({
  meta: {
    name: 'run:android',
    version: version,
  },
  args: {},
  async run({ args }) {
    const { run } = await import('./cli/runAndroid')
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

const patch = defineCommand({
  meta: {
    name: 'patch',
    version: '0.0.0',
    description: 'Apply package patches',
  },
  args: {},
  async run({ args }) {
    const { run } = await import('./cli/patch')
    await run(args)
  },
})

const subCommands = {
  dev,
  clean,
  build: buildCommand,
  prebuild,
  'run:ios': runIos,
  'run:android': runAndroid,
  patch,
  serve: serveCommand,
}

// workaround for having sub-commands but also positional arg for naming in the create flow
const subMain = defineCommand({
  meta: {
    name: 'main',
    version: version,
    description: 'Welcome to One',
  },
  subCommands,
})

const main = defineCommand({
  meta: {
    name: 'main',
    version: version,
    description: 'Welcome to One',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Folder name to place the app into',
      required: false,
    },
  },
  async run({ args }) {
    if (subCommands[args.name]) {
      // run sub command ourselves
      runMain(subMain)
      return
    }

    const { cliMain } = await import('./cli/main')
    await cliMain(args)
  },
})

// workaround for help with our workaround for sub-command + positional arg

const helpIndex = process.argv.indexOf('--help')
if (helpIndex > 0) {
  const subCommandName = process.argv[helpIndex - 1]
  const subCommand = subCommands[subCommandName]
  if (subCommand) {
    showUsage(subCommand)
  }
} else {
  runMain(main)
}
