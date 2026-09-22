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
