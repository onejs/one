import { useEffect, useState } from 'react'
import { Image, TurboModuleRegistry } from 'react-native'
import type { Spec as OneNativeFontsSpec } from '../specs/OneNativeFontsNativeModule'
import type { FontMap, Fonts as FontsApi, FontSource, UseFontsResult } from './types'

export type * from './types'

let cachedModule: OneNativeFontsSpec | null | undefined

function getModule(): OneNativeFontsSpec | null {
  if (cachedModule === undefined) {
    cachedModule = TurboModuleRegistry.get<OneNativeFontsSpec>('OneNativeFonts')
  }
  return cachedModule
}

function resolveFontUri(name: string, source: FontSource): string {
  if (typeof source === 'string') {
    return source
  }
  const resolved = Image.resolveAssetSource(source)
  if (!resolved) {
    throw new Error(`Fonts.load: "${name}" is not a font asset`)
  }
  return resolved.uri
}

async function load(fonts: FontMap): Promise<void> {
  const module = getModule()
  if (!module) {
    throw new Error('fonts need a native build that includes @vxrn/native')
  }
  const entries = Object.entries(fonts).map(([name, source]) => ({
    name,
    uri: resolveFontUri(name, source),
  }))
  await Promise.all(entries.map(({ name, uri }) => module.load(name, uri)))
}

function isLoaded(name: string): boolean {
  const module = getModule()
  if (!module) {
    return false
  }
  return module.isLoaded(name)
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
