import { ExpoRoot, type ExpoRootProps } from './ExpoRoot'
import type { GlobbedRouteImports } from './types'
import { useViteRoutes } from './useViteRoutes'

type RootProps = Omit<ExpoRootProps, 'context'> & { routes: GlobbedRouteImports; path?: string }

// ⚠️ <StrictMode> breaks expo router!
// Suspense here made hydration mis-match despite nothing thrown?

export function Root({ routes, path, ...props }: RootProps) {
  const context = useViteRoutes(routes, globalThis['__vxrnVersion'])

  return (
    <ExpoRoot
      location={path ? new URL(`http://localhost:3333${path}`) : undefined}
      context={context}
      {...props}
    />
  )
}
