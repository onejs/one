import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import server from '../dist/server/server.js'

// matches the One baseline's Hono static serving, compression and cache policy
const app = new Hono()
app.use(compress())
app.use('*', serveStatic({
  root: './dist/client',
  onFound(path, context) {
    context.header('Cache-Control', path.includes('/assets/')
      ? 'public, immutable, max-age=31536000'
      : 'public, max-age=0, must-revalidate')
  },
}))
app.all('*', context => server.fetch(context.req.raw))
const port = Number(process.env.PORT || 4312)
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`Local: http://127.0.0.1:${port}/`)
})
