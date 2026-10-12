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
  // document.fonts.check answers true for unknown families, so read the
  // set directly: the name counts only when a face finished loading.
  let found = false
  document.fonts.forEach((face) => {
    if (face.family === name && face.status === 'loaded') {
      found = true
    }
  })
  return found
}

export const Fonts: FontsApi = {
  load,
  isLoaded,
}

export function useFonts(fonts: FontMap): UseFontsResult {
  // seeded from the platform so a map that is already usable never
  // flashes unloaded. the effect runs once on mount, like expo-font: a
  // literal map is a new object every render, so [fonts] would reload
  // forever.
  const [loaded, setLoaded] = useState(() => Object.keys(fonts).every(isLoaded))
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (loaded) {
      return
    }
    let cancelled = false
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [loaded, error]
}
