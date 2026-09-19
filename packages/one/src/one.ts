// public root One value. web and server imports work with no native
// implementation installed. native namespaces stay undefined until a
// build-time platform entrypoint selects one adapter.

import type { One as OneNamespace } from './interfaces/router'
import { selectOneNativePlatform, type OnePlatformName } from './native/platform'

export type One = OneNamespace

export type OneEnvironment = {
  platform: OnePlatformName
}

function currentPlatform(): OnePlatformName {
  const defined =
    (globalThis as any).__ONE_PLATFORM__ ??
    (typeof process !== 'undefined' ? (process.env as any)?.ONE_PLATFORM : undefined)
  return defined === 'ios' || defined === 'android' || defined === 'rnx'
    ? defined
    : 'web'
}

export const One = {
  get platform(): OnePlatformName {
    return currentPlatform()
  },
  // generated platform-faithful namespaces. populated only by explicit
  // platform entrypoints; never eagerly resolved from the root.
  get iOS(): unknown {
    return undefined
  },
  get Android(): unknown {
    return undefined
  },
  UI: {},
  selectAdapter(name: OnePlatformName) {
    return selectOneNativePlatform(name)
  },
}
