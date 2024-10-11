import { virtualEntryIdNative } from '../vite/virtualEntryPlugin'
import { labelProcess } from './label-process'

export async function run(args: {
  clean?: boolean
  host?: string
  port?: string
  https?: boolean
  mode?: 'development' | 'production'
}) {
  labelProcess('dev')

  const { dev } = await import('vxrn')

  const { start, stop } = await dev({
    mode: args.mode,
    clean: args.clean,
    root: process.cwd(),
    server: {
      https: args.https,
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
