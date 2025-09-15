import { setServerGlobals } from '../server/setServerGlobals'
import { virtualEntryIdNative } from '../vite/plugins/virtualEntryConstants'
import { checkNodeVersion } from './checkNodeVersion'
import { labelProcess } from './label-process'

export async function dev(args: {
  clean?: boolean
  host?: string
  port?: string
  https?: boolean
  mode?: 'development' | 'production'
  debugBundle?: string
  debug?: string
}) {
  labelProcess('dev')
  checkNodeVersion()
  setServerGlobals()

  const { dev } = await import('vxrn/dev')

  const { start, stop } = await dev({
    mode: args.mode,
    clean: args.clean,
    root: process.cwd(),
    debugBundle: args.debugBundle,
    debug: args.debug,
    server: {
      host: args.host,
      port: args.port ? +args.port : undefined,
    },
    entries: {
      native: virtualEntryIdNative,
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

  // Prevent syntax errors in user's code from crashing the dev server.
  // TODO: It seems that Vite CLI isn't doing this and is using another way
  // to prevent such crashes. May need to investigate further.
  process.on('unhandledRejection', (err) => {
    console.error(err)
  })

  await closePromise
}
