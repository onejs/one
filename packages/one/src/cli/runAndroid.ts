import { virtualEntryIdNative } from '../vite/plugins/virtualEntryConstants'
import { setServerGlobals } from '../server/setServerGlobals'
import { labelProcess } from './label-process'

export async function run(args: { dev?: boolean }) {
  const { runAndroid } = await import('vxrn')

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

    // Then build and launch Android app
    await runAndroid({
      root: process.cwd(),
    })
  } else {
    await runAndroid({
      root: process.cwd(),
    })
  }
}
