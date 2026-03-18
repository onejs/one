import { networkInterfaces } from 'node:os'
import { serve as honoServe } from '@hono/node-server'
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

export async function honoServeNode(app: Hono, options: VXRNServeOptions) {
  const server = honoServe({
    fetch: app.fetch,
    port: options.port,
    hostname: options.host,
  })

  const colorUrl = (url: string) =>
    colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

  const displayHost = options.host === '0.0.0.0' ? 'localhost' : options.host
  const localUrl = `http://${displayHost}:${options.port}/`

  console.info()
  console.info(`  ${colors.green('➜')}  ${colors.bold('Local')}:   ${colorUrl(localUrl)}`)

  if (options.host === '0.0.0.0') {
    const networkHost = getNetworkAddress()
    if (networkHost) {
      const networkUrl = `http://${networkHost}:${options.port}/`
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
