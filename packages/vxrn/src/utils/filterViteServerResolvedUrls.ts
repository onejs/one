import type { ResolvedServerUrls } from 'vite'
import ip from 'ip'

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
  const ipAddress = ip.address()
  network = network.filter((url) => url.includes(ipAddress))

  return { local, network }
}
