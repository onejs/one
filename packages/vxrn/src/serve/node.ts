import { createServer } from 'node:http'
import { networkInterfaces, platform } from 'node:os'
import { getRequestListener } from '@hono/node-server'
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

const isBun = typeof process.versions.bun !== 'undefined'

// linux 3.9+ supports SO_REUSEPORT
// node 22.12+ exposes reusePort in listen(), bun supports it natively
const canReusePort =
  !['win32', 'darwin'].includes(platform()) &&
  (isBun ||
    (() => {
      const [major, minor] = process.versions.node.split('.').map(Number)
      return major > 22 || (major === 22 && minor >= 12) || major >= 23
    })())

export { canReusePort }

export async function honoServeNode(app: Hono, options: VXRNServeOptions) {
  const port = options.port ?? 3000
  const host = options.host ?? '0.0.0.0'

  const listener = getRequestListener((request, env) => {
    request.headers.delete('x-vxrn-peer-address')
    const address = env.incoming.socket.remoteAddress
    if (address) request.headers.set('x-vxrn-peer-address', address)
    return app.fetch(request, env)
  })
  const server = createServer(listener)
  server.listen({
    port,
    host,
    ...(canReusePort && process.env.ONE_CLUSTER_WORKER === '1'
      ? { reusePort: true }
      : {}),
  })

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

  const shutdown = () => server.close()

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  await new Promise<void>((res, rej) => {
    server.once('error', rej)
    server.on('close', () => {
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
      res()
    })
  })
}
