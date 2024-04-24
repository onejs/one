import { ExpoRoot, type ExpoRootProps } from './ExpoRoot'

import { Suspense } from 'react'
import type { GlobbedRouteImports } from './types'
import { useViteRoutes } from './useViteRoutes'

type RootProps = Omit<ExpoRootProps, 'context'> & { routes: GlobbedRouteImports; path?: string }

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

function Test({ routes, path, ...props }: RootProps) {
  const context = useViteRoutes(routes)

  console.debug(`ExpoRouter loading`, context)

  return (
    <ExpoRoot
      location={path ? new URL(`http://localhost:3333${path}`) : undefined}
      context={context}
      {...props}
    />
  )
}
