import './setup'

import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import { render } from './render'
import { findRootLayout } from './utils/findRootLayout'
import type { One } from './vite/types'

export { Root }

export type CreateHeadlessAppProps = {
  routes: Record<string, () => Promise<unknown>>
  routerRoot: string
  path?: string
  flags?: One.Flags
  getSetupPromise?: () => Promise<unknown>
}

export function createApp(options: CreateHeadlessAppProps) {
  // always spa mode — render() checks this to use createRoot instead of hydrateRoot
  globalThis['__vxrnIsSPA'] = true

  const setupComplete = options.getSetupPromise
    ? options.getSetupPromise()
    : Promise.resolve()

  return setupComplete
    .then(() => findRootLayout(options.routes, options.routerRoot))
    .then(() => resolveClientLoader({}))
    .then(() => {
      render(
        <Root
          isClient
          flags={options.flags}
          routes={options.routes}
          routerRoot={options.routerRoot}
          path={
            options.path || (typeof window !== 'undefined' ? window.location.href : '/')
          }
        />
      )
    })
    .catch((err) => {
      console.error(`[one/headless] Error during initialization:`, err)
    })
}
