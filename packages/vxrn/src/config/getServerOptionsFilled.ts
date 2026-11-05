import { createServer } from 'node:net'
import type { Mode, VXRNOptions, VXRNServeOptionsFilled } from '../types'

// ports browsers refuse to connect to, so binding one would serve nothing.
// same list get-port-please filters; vxrn's default ranges never hit it.
const UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87,
  95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139,
  143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548,
  554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659,
  4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
])

const HOSTNAME_RE = /^(?!-)[\d.:A-Za-z-]{1,63}(?<!-)$/

function tryPort(port: number, host: string | undefined): Promise<number | false> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.on('error', () => {
      resolve(false)
    })
    server.listen({ port, host }, () => {
      const bound = (server.address() as { port: number }).port
      server.close(() => {
        resolve(!UNSAFE_PORTS.has(bound) && bound)
      })
    })
  })
}

async function getPort({
  port,
  portRange,
  host,
}: {
  port: number
  portRange: [number, number]
  host: string | undefined
}): Promise<number> {
  if (host && !HOSTNAME_RE.test(host)) {
    host = '127.0.0.1'
  }
  const ports = [port]
  for (let p = portRange[0]; p <= portRange[1]; p++) {
    ports.push(p)
  }
  for (const p of ports) {
    if (!p || UNSAFE_PORTS.has(p)) continue
    const found = await tryPort(p, host)
    if (found) return found
  }
  const random = await tryPort(0, host)
  if (random) return random
  throw new Error(
    `Unable to find an available port ${host ? `on host ${JSON.stringify(host)}` : 'on any host'} (tried ${portRange.join('-')})`
  )
}

export async function getServerOptionsFilled(
  serverOptions: VXRNOptions['server'],
  mode: Mode
): Promise<VXRNServeOptionsFilled> {
  const {
    host = '0.0.0.0' /* TODO: default to 127.0.0.1 unless a remote device needs the server */,
    port: requestedPort,
    https,
  } = serverOptions || {}

  const envPort = process.env.ONE_PORT ? Number(process.env.ONE_PORT) : undefined
  const forcePort = process.env.ONE_FORCE_PORT
    ? Number(process.env.ONE_FORCE_PORT)
    : undefined
  const defaultPort = mode === 'dev' ? 8081 : 3000
  const portToUse = forcePort ?? requestedPort ?? envPort ?? defaultPort
  const protocol = https ? ('https:' as const) : ('http:' as const)

  // in cluster worker mode with SO_REUSEPORT, skip the port check —
  // multiple processes intentionally bind the same port
  const isClusterWorker = process.env.ONE_CLUSTER_WORKER === '1'

  let port: number
  if (isClusterWorker) {
    port = portToUse
  } else {
    // if a specific port was requested (via CLI, env, or force), only try that port (strict mode)
    // otherwise, allow finding an available port in a range
    const isExplicitPort = !!(forcePort ?? requestedPort ?? envPort)
    port = await getPort({
      port: portToUse,
      portRange: isExplicitPort ? [portToUse, portToUse] : [portToUse, portToUse + 100],
      host,
    })

    // if an explicit port was requested and we couldn't get it, error out
    if (isExplicitPort && port !== portToUse) {
      throw new Error(
        `Port ${portToUse} is already in use. Either free the port or use a different one.`
      )
    }
  }

  // Use localhost for the URL when host is 0.0.0.0 since that's how clients will access it
  const urlHost = host === '0.0.0.0' ? 'localhost' : host

  return {
    loadEnv: false,
    compress: true,
    ...serverOptions,
    port,
    host,
    protocol,
    url: `${protocol}//${urlHost}:${port}`,
  }
}
