import { Hono } from 'hono'
import { compress } from 'hono/compress'
// import { cache } from 'hono/cache'
import { serveStatic } from '@hono/node-server/serve-static'

import type { VXRNConfig } from '../types'

export const createProdServer = async (options: VXRNConfig) => {
  const app = new Hono()

  app.use(compress())

  app.use(
    '*',
    serveStatic({
      root: './dist/client',
    })
  )

  // app.get(
  //   '*',
  //   cache({
  //     cacheName: 'my-app',
  //     cacheControl: 'max-age=3600',
  //   })
  // )

  if (options.serve) {
    options.serve(options, app)
  }

  return app
}

// // testing cache
// const caches = {}
// function createCache(name: string) {
//   if (caches[name]) return caches[name] as any
//   const store = {}
//   const cache = {
//     async match(key: string) {
//       console.log('matching', key)
//       return store[key]
//     },
//     async put(key: string, val) {
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
