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
    stop()
  })

  process.on('uncaughtException', (err) => {
    console.error(err?.message || err)
  })

  await closePromise
}
