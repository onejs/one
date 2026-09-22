import { useEffect, useState } from 'react'
import type { FontMap, Fonts as FontsApi, UseFontsResult } from './types'

export type * from './types'

// web entry. a font import under Vite evaluates to a URL string, so only
// strings load; a font known at build time belongs in CSS @font-face,
// which avoids a swap after first paint, and load is for fonts chosen at
// runtime. signatures stay identical to the native entry.

async function load(fonts: FontMap): Promise<void> {
  if (typeof document === 'undefined') {
    return
  }
  const entries = Object.entries(fonts).map(([name, source]) => {
    if (typeof source !== 'string') {
      throw new Error(`Fonts.load: "${name}" is not a font asset`)
    }
    return { name, uri: source }
  })
  await Promise.all(
    entries.map(async ({ name, uri }) => {
      try {
        const face = new FontFace(name, `url(${uri})`)
        await face.load()
        document.fonts.add(face)
      } catch (cause) {
        throw new Error(`Fonts.load: "${name}" could not be loaded`, { cause })
      }
    })
  )
}

function isLoaded(name: string): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  return document.fonts.check(`16px "${name}"`)
}

export const Fonts: FontsApi = {
  load,
  isLoaded,
}

export function useFonts(fonts: FontMap): UseFontsResult {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setError(null)
    load(fonts).then(
      () => {
        if (!cancelled) {
          setLoaded(true)
        }
      },
      (reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason : new Error(String(reason)))
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [fonts])

  return [loaded, error]
}
