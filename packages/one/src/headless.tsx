import './setup'

import type { OneLinkingConfig } from './link/getLinking'
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
  linking?: OneLinkingConfig
  getSetupPromise?: () => Promise<unknown>
}

export function createApp(options: CreateHeadlessAppProps) {
  // always spa mode — render() checks this to use createRoot instead of hydrateRoot
  globalThis['__vxrnIsSPA'] = true
  // headless mode has no dev server serving /_one/assets/*_vxrn_loader.js;
  // routes (and their loader exports) are statically bundled and accessed
  // through `options.routes`. doPreloadDev/doPreload short-circuit on this
  // flag so they don't round-trip through an iframe-host URL that can return
  // a spurious __oneError 404 for paths overlapping the host's route tree.
  globalThis['__vxrnHeadless'] = true

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
          linking={options.linking}
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
