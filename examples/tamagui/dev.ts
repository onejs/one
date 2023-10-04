import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { create } from 'vxrn'

dev()

async function dev() {
  const tamaguiVitePlugin = tamaguiPlugin({
    components: ['@tamagui/core'],
    config: 'src/tamagui.config.ts',
  })

  const { viteServer, start, stop } = await create({
    root: process.cwd(),
    host: '127.0.0.1',
    webConfig: {
      plugins: [tamaguiVitePlugin],
    },
    buildConfig: {
      plugins: [],
    },
  })

  const { closePromise } = await start()

  viteServer.printUrls()

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
