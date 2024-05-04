import { ExpoRoot, type ExpoRootProps } from './ExpoRoot'
import type { GlobbedRouteImports } from './types'
import { useViteRoutes } from './useViteRoutes'

type RootProps = Omit<ExpoRootProps, 'context'> & { routes: GlobbedRouteImports; path?: string }

export function Root(props: RootProps) {
  return (
    // ⚠️ <StrictMode> breaks expo router!
    // this made hydration mis-match despite nothing thrown?
    // <Suspense fallback={null}>
    <Contents {...props} />
    // </Suspense>
  )
}

function Contents({ routes, path, ...props }: RootProps) {
  const context = useViteRoutes(routes, globalThis['__vxrnVersion'])

  return (
    <ExpoRoot
      location={path ? new URL(`http://localhost:3333${path}`) : undefined}
      context={context}
      {...props}
    />
  )
}
