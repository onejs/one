import type { ReactElement } from 'react'
import type { Metrics, NativeSafeAreaProviderProps } from './types'

// web entry. only the pure inset math and types live here; the provider
// host stays in index.native.ts so no bundler ever resolves the Fabric
// spec or any react-native deep import from the web graph. signatures stay
// identical to the native entry because the published declarations are
// built from this file and serve both platforms.
export type * from './types'
export {
  buildSafeAreaInsetStyle,
  keyboardSafeBottom,
  providerEventToMetrics,
  resolveOverlappingInsets,
  resolveSafeAreaEdgeModes,
} from './insets'

export function getInitialWindowMetrics(): Metrics | null {
  return null
}

// renders nothing on web: rendering throws, but the declaration returns an
// element so native consumers typecheck against the host component shape.
export function NativeSafeAreaProvider(
  _props: NativeSafeAreaProviderProps
): ReactElement {
  throw new Error(
    'NativeSafeAreaProvider requires a native build'
  )
}
