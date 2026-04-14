// renders fine on initial mount, then on a re-render reads ?type from the
// URL and throws synchronously. effect-driven so the throw happens after
// hydration (the root error boundary doesn't catch SSR-time throws).
import { useEffect, useState } from 'react'

export default function Crash() {
  const [shouldThrow, setShouldThrow] = useState(false)

  useEffect(() => {
    setShouldThrow(true)
  }, [])

  if (shouldThrow) {
    const type =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('type')
        : null

    if (type === 'chunk') {
      // matches the chrome chunk-load message in CHUNK_ERROR_PATTERNS
      throw new Error(
        'Failed to fetch dynamically imported module: https://example.com/assets/foo-abc123.js'
      )
    }
    if (type === 'other') {
      // a generic render bug — boundary should fall through to the
      // version-check path, which only reloads on a real version mismatch
      throw new Error('boom: synthetic render error for skew test')
    }
  }

  return <div id="crash-mounted">crash-mounted</div>
}
