import { getPort } from 'get-port-please'
import type { Mode, VXRNOptions, VXRNServeOptionsFilled } from '../types'

export async function getServerOptionsFilled(
  serverOptions: VXRNOptions['server'],
  mode: Mode
): Promise<VXRNServeOptionsFilled> {
  const {
    host = '0.0.0.0' /* TODO: Better default to 127.0.0.1 due to security reasons, and only dynamically change to 0.0.0.0 if the user is requesting an Expo QR code */,
    port: defaultPort = mode === 'dev' ? 8081 : 3000,
  } = serverOptions || {}

  const protocol = 'http:' as const

  const port = await getPort({
    port: defaultPort,
    portRange: [defaultPort, defaultPort + 100],
    host,
  })

  return {
    loadEnv: false,
    compress: true,
    ...serverOptions,
    port,
    host,
    protocol,
    url: `${protocol}//${host}:${port}`,
  }
}
