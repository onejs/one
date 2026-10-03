import { Hono } from 'hono'
import { serve } from 'one/serve'
import { startLocalSyncHost } from 'orez-lite/local'
import { ports } from './env.ts'
import config from './orez-lite.config.ts'

const syncHost = await startLocalSyncHost(config)
const app = new Hono()
app.all('/zero-http/*', async (context) => {
  const url = new URL(context.req.url)
  url.hostname = '127.0.0.1'
  url.port = String(config.port)
  url.protocol = 'http:'
  url.pathname = `/${config.namespace}${url.pathname.slice('/zero-http'.length)}`
  return fetch(new Request(url, context.req.raw))
})

void syncHost.exited.then((exit) => {
  if (exit.expected) return
  console.error('SQLite sync host exited', exit)
  process.exit(1)
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await syncHost.close()
    await import('./database/installLocalApplicationSql.server.ts').then((module) =>
      module.localApplicationSqlClientFactory.close(),
    )
    process.exit(0)
  })
}
await serve({ app, host: '0.0.0.0', port: ports.web })
