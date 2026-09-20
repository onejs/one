// public root One value. web and server imports work with no native
// implementation installed. native namespaces stay undefined until a
// build-time platform entrypoint selects one adapter.

import { selectOneNativePlatform, type OnePlatformName } from './native/platform'

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
  // generated platform-faithful namespaces. resolved from the build-time
  // platform define (ONE_PLATFORM), never eagerly imported from the root,
  // so web and server imports work with no native implementation installed.
  get iOS(): unknown {
    return selectOneNativePlatform(currentPlatform()).platformBindings.iOS
  },
  get Android(): unknown {
    return selectOneNativePlatform(currentPlatform()).platformBindings.Android
  },
  UI: {},
  selectAdapter(name: OnePlatformName) {
    return selectOneNativePlatform(name)
  },
}
