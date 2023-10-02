import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { create } from '@vite-react-native/vite-react-native'

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

  await closePromise
}
