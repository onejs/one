import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'

import type { VXRNOptions } from '../types'

export const createProdServer = async (options: VXRNOptions) => {
  const app = new Hono()

  app.use(compress())

  app.use('*', async (c, next) => {
    let didCallNext = false

    const response = await serveStatic({
      root: './dist/client',
    })(c, async () => {
      didCallNext = true
      await next()
    })

    if (!response || didCallNext) {
      return
    }

    // set reasonable cache control header
    c.header(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=600, stale-if-error=86400'
    )

    return response
  })

  // app.get(
  //   '*',
  //   cache({
  //     cacheName: 'vxs-app',
  //     // 2 days
  //     cacheControl: 'public, max-age=172800, immutable',
  //   })
  // )

  return app
}

// simple memory cache
// const caches = {}

// function createCache(name: string) {
//   if (caches[name]) return caches[name] as any

//   let store = {}

//   function clearIfMemoryPressure() {
//     const total = os.totalmem()
//     const free = os.freemem()
//     const used = total - free
//     // Threshold (50% of total memory)
//     if (used > total * 0.5) {
//       console.info('Clearing cache due to memory pressure')
//       store = {}
//     }
//   }

//   const cache = {
//     async match(key: string) {
//       return store[key]
//     },
//     async put(key: string, val: string) {
//       // prevent oom
//       clearIfMemoryPressure()
//       store[key] = val
//     },
//     async delete(key: string) {
//       delete store[key]
//     },
//   }
//   caches[name] = cache
//   return cache
// }

// globalThis.caches = {
//   ...createCache(''),
//   async open(name: string) {
//     return createCache(name)
//   },
// }
