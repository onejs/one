import { serveStatic } from '@hono/node-server/serve-static'
import type { Context } from 'hono'

// hashed assets can be cached forever, html must revalidate
const hashedAssetRe = /\.[a-zA-Z0-9_-]{8,}\.\w+$/

export async function serveStaticAssets({
  context,
  next,
}: {
  context: Context
  next?: () => Promise<void>
}) {
  let didCallNext = false

  const response = await serveStatic({
    root: './dist/client',
    onFound: (path, c) => {
      if (hashedAssetRe.test(path)) {
        c.header('Cache-Control', 'public, immutable, max-age=31536000')
      } else {
        c.header('Cache-Control', 'public, max-age=0, must-revalidate')
      }
    },
  })(context, async () => {
    didCallNext = true
    await next?.()
  })

  if (!response || didCallNext) {
    return
  }

  return response
}
