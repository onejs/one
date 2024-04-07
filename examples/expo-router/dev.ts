import { create } from 'vxrn'

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

  process.on('beforeExit', () => {
    stop()
  })

  process.on('SIGINT', () => {
    stop()
  })

  process.on('uncaughtException', (err) => {
    console.info(err?.message || err)
  })

  await closePromise
}
