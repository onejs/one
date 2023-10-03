import { create } from '@vite-react-native/vite-react-native'

dev()

async function dev() {
  const { viteServer, start, stop } = await create({
    root: process.cwd(),
    host: '127.0.0.1',
    webConfig: {
      plugins: [],
    },
    buildConfig: {
      plugins: [],
    },
  })

  const { closePromise } = await start()

  viteServer.printUrls()

  await closePromise
}
