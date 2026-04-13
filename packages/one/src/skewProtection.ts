import { CACHE_KEY } from './constants'
import { getURL } from './getURL'
import { handleSkewError } from './utils/dynamicImport'

let stale = false
let polling: ReturnType<typeof setTimeout> | null = null
let inFlightCheck: Promise<boolean> | null = null

export function isVersionStale() {
  if (stale) return true
  // also check window flag so external code can mark stale
  if (typeof window !== 'undefined' && (window as any).__oneVersionStale) return true
  return false
}

function markStale(version?: string) {
  stale = true
  if (typeof window !== 'undefined') {
    ;(window as any).__oneVersionStale = true
    window.dispatchEvent(new CustomEvent('one-version-update', { detail: { version } }))
  }
}

// one-shot version check for use when something already looks wrong
// (e.g. an error reached the root boundary). reloads if the deployed
// version no longer matches our build, otherwise leaves the error UI alone.
// dedupes concurrent calls so a render-loop crash only fetches once.
export function checkSkewAndReload(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (process.env.ONE_SKEW_PROTECTION === 'false') return Promise.resolve(false)
  if (isVersionStale()) {
    handleSkewError()
    return Promise.resolve(true)
  }
  if (inFlightCheck) return inFlightCheck
  inFlightCheck = (async () => {
    try {
      const res = await fetch(`${getURL()}/version.json`, {
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data.version && data.version !== CACHE_KEY) {
        markStale(data.version)
        handleSkewError()
        return true
      }
      return false
    } catch {
      return false
    } finally {
      inFlightCheck = null
    }
  })()
  return inFlightCheck
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
        markStale(data.version)
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
