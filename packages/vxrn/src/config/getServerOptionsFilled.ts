import { getPort } from 'get-port-please'
import type { Mode, VXRNOptions, VXRNServeOptionsFilled } from '../types'

export async function getServerOptionsFilled(
  serverOptions: VXRNOptions['server'],
  mode: Mode
): Promise<VXRNServeOptionsFilled> {
  const {
    host = '0.0.0.0' /* TODO: Better default to 127.0.0.1 due to security reasons, and only dynamically change to 0.0.0.0 if the user is requesting an Expo QR code */,
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
