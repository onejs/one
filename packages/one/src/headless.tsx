import { startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import type { One } from './vite/types'

export { Root }

export type CreateHeadlessAppProps = {
  routes: Record<string, () => Promise<unknown>>
  routerRoot: string
  path?: string
  flags?: One.Flags
  getSetupPromise?: () => Promise<unknown>
}

// track root for hmr
let root: ReturnType<typeof createRoot> | null = null

function findRootLayout(
  routes: Record<string, () => Promise<unknown>>,
  routerRoot: string
): Promise<unknown> | undefined {
  const exactKey = `/${routerRoot}/_layout.tsx`
  if (routes[exactKey]) return routes[exactKey]()

  for (const suffix of ['+ssg', '+ssr', '+spa']) {
    const key = `/${routerRoot}/_layout${suffix}.tsx`
    if (routes[key]) return routes[key]()
  }

  const exactKeyTs = `/${routerRoot}/_layout.ts`
  if (routes[exactKeyTs]) return routes[exactKeyTs]()

  for (const suffix of ['+ssg', '+ssr', '+spa']) {
    const key = `/${routerRoot}/_layout${suffix}.ts`
    if (routes[key]) return routes[key]()
  }

  return undefined
}

export function createApp(options: CreateHeadlessAppProps) {
  // always spa mode
  globalThis['__vxrnIsSPA'] = true

  const setupComplete = options.getSetupPromise
    ? options.getSetupPromise()
    : Promise.resolve()

  return setupComplete
    .then(() => findRootLayout(options.routes, options.routerRoot))
    .then(() => resolveClientLoader({}))
    .then(() => {
      const element = (
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

      startTransition(() => {
        const rootElement = document.getElementById('root') || document.documentElement

        if (root) {
          // hmr update
          root.render(element)
        } else {
          root = createRoot(rootElement)
          root.render(element)
        }
      })
    })
    .catch((err) => {
      console.error(`[one/headless] Error during initialization:`, err)
    })
}
