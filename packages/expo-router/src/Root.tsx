import { ExpoRoot } from './ExpoRoot'

import { Suspense } from 'react'
import { useViteRoutes } from './useViteRoutes'
import type { GlobbedRouteImports } from './types'

type RootProps = { routes: GlobbedRouteImports; path?: string }

export function Root(props: RootProps) {
  return (
    // ⚠️ <StrictMode> breaks expo router!
    <>
      <Suspense fallback={null}>
        <Router {...props} />
      </Suspense>
    </>
  )
}

// idk why this in between view fixed an error with logs not showing
function Router(props: RootProps) {
  return <Test {...props} />
}

function Test({ routes, path }: RootProps) {
  const context = useViteRoutes(routes)
  return (
    <ExpoRoot
      location={path ? new URL(`http://localhost:3333${path}`) : undefined}
      context={context}
    />
  )
}
