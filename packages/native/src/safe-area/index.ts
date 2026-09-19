import type { Metrics, NativeSafeAreaProviderProps } from './types'

// web entry. only the pure inset math and types live here; the provider
// host stays in index.native.ts so no bundler ever resolves the Fabric
// spec or any react-native deep import from the web graph. signatures stay
// identical to the native entry because the published declarations are
// built from this file and serve both platforms.
export type * from './types'
export {
  buildSafeAreaInsetStyle,
  providerEventToMetrics,
  resolveSafeAreaEdgeModes,
} from './insets'

export function getInitialWindowMetrics(): Metrics | null {
  return null
}

export function NativeSafeAreaProvider(_props: NativeSafeAreaProviderProps): never {
  throw new Error(
    'NativeSafeAreaProvider requires a native build with @vxrn/native installed'
  )
}
