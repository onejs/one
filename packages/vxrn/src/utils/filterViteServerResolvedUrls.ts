import { networkInterfaces } from 'node:os'
import type { ResolvedServerUrls } from 'vite'

function getLocalIpAddress(): string | undefined {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      // Skip internal and non-IPv4 addresses
      if (!net.internal && net.family === 'IPv4') {
        return net.address
      }
    }
  }
  return undefined
}

/**
 * Filter out non-useful URLs from Vite server resolved URLs.
 */
export function filterViteServerResolvedUrls(
  urls: ResolvedServerUrls | null
): ResolvedServerUrls | null {
  if (!urls) {
    return urls
  }

  let local = urls.local
  let network = urls.network

  // TODO: We might need to preserve both if connected to WiFi and Ethernet at the same time.
  const ipAddress = getLocalIpAddress()
  if (ipAddress) {
    network = network.filter((url) => url.includes(ipAddress))
  }

  return { local, network }
}
