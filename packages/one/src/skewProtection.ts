import { CACHE_KEY } from './constants'
import { getURL } from './getURL'

let stale = false
let polling: ReturnType<typeof setTimeout> | null = null

export function isVersionStale() {
  if (stale) return true
  // also check window flag so external code can mark stale
  if (typeof window !== 'undefined' && (window as any).__oneVersionStale) return true
  return false
}

export function setupSkewProtection() {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'development') return
  if (process.env.ONE_SKEW_PROTECTION !== 'proactive') return

  const POLL_INTERVAL = 120_000 // 2 minutes
  const baseUrl = getURL()

  async function check() {
    try {
      const res = await fetch(`${baseUrl}/version.json`, {
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      })
      if (!res.ok) {
        // transient error, keep polling
        polling = setTimeout(check, POLL_INTERVAL)
        return
      }
      const data = await res.json()
      if (data.version !== CACHE_KEY) {
        stale = true
        ;(window as any).__oneVersionStale = true
        window.dispatchEvent(
          new CustomEvent('one-version-update', { detail: { version: data.version } })
        )
        // stop polling once stale detected
        return
      }
    } catch {
      // network error, keep polling
    }
    polling = setTimeout(check, POLL_INTERVAL)
  }

  polling = setTimeout(check, POLL_INTERVAL)
}
