import { createServer, type Server } from 'node:http'
import { networkInterfaces, platform } from 'node:os'
import { getRequestListener } from '@hono/node-server'
import { serve as honoServe } from '@hono/node-server'
import type { ServerType } from '@hono/node-server'
import type { Hono } from 'hono'
import colors from 'picocolors'
import type { VXRNServeOptions } from '../types'

function getNetworkAddress(): string | undefined {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const addr of addresses || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
}

// linux 3.9+ with node 22.12+ supports SO_REUSEPORT
const canReusePort =
  !['win32', 'darwin'].includes(platform()) &&
  (() => {
    const [major, minor] = process.versions.node.split('.').map(Number)
    return major > 22 || (major === 22 && minor >= 12) || major >= 23
  })()

export { canReusePort }

export async function honoServeNode(app: Hono, options: VXRNServeOptions) {
  const port = options.port ?? 3000
  const host = options.host ?? '0.0.0.0'

  let server: Server | ServerType

  if (canReusePort) {
    // bypass @hono/node-server's serve() to use reusePort directly
    // kernel distributes connections across workers - no IPC bottleneck
    const listener = getRequestListener(app.fetch)
    server = createServer(listener)
    server.listen({ port, host, reusePort: true })
  } else {
    server = honoServe({
      fetch: app.fetch,
      port,
      hostname: host,
    })
  }

  const colorUrl = (url: string) =>
    colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

  const displayHost = host === '0.0.0.0' ? 'localhost' : host
  const localUrl = `http://${displayHost}:${port}/`

  console.info()
  console.info(`  ${colors.green('➜')}  ${colors.bold('Local')}:   ${colorUrl(localUrl)}`)

  if (host === '0.0.0.0') {
    const networkHost = getNetworkAddress()
    if (networkHost) {
      const networkUrl = `http://${networkHost}:${port}/`
      console.info(
        `  ${colors.green('➜')}  ${colors.bold('Network')}: ${colorUrl(networkUrl)}`
      )
    }
  }
  console.info()

  const shutdown = () => {
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
