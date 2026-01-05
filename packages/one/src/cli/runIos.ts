import { virtualEntryIdNative } from '../vite/plugins/virtualEntryConstants'
import { setServerGlobals } from '../server/setServerGlobals'
import { labelProcess } from './label-process'

export async function run(args: { dev?: boolean }) {
  const { runIos } = await import('vxrn')

  if (args.dev) {
    labelProcess('dev')
    setServerGlobals()

    const { dev } = await import('vxrn/dev')

    // Start dev server first
    const { start } = await dev({
      mode: 'development',
      root: process.cwd(),
      entries: {
        native: virtualEntryIdNative,
      },
    })
    await start()

    // Then build and launch iOS app
    await runIos({
      root: process.cwd(),
    })
  } else {
    await runIos({
      root: process.cwd(),
    })
  }
}
