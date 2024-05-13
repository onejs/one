import { StrictMode } from 'react'
import { ExpoRoot, type ExpoRootProps } from './ExpoRoot'
import { RootErrorBoundary } from './RootErrorBoundary'
import type { GlobbedRouteImports } from './types'
import { useViteRoutes } from './useViteRoutes'

type RootProps = Omit<ExpoRootProps, 'context'> & {
  routes: GlobbedRouteImports
  path?: string
}

// export function Root(props: RootProps) {
//   return (
//     // ⚠️ <StrictMode> breaks expo router!
//     // this made hydration mis-match despite nothing thrown?
//     // <Suspense fallback={null}>
//     // <Contents {...props} />
//     // </Suspense>
//   )
// }

export function Root({ routes, path, ...props }: RootProps) {
  const context = useViteRoutes(routes, globalThis['__vxrnVersion'])

  return (
    // <StrictMode>
    <RootErrorBoundary>
      <ExpoRoot
        location={
          typeof window !== 'undefined'
            ? new URL(path || window.location.pathname || '/', window.location.href)
            : new URL(path || '/', 'http://localhost')
        }
        context={context}
        {...props}
      />
    </RootErrorBoundary>
    // </StrictMode>
  )
}

// if getting element type is undefined
// this helped debug some hard to debug ish
// // its so hard to debug ssr and we get no componentstack trace, this helps:
// if (typeof window === 'undefined') {
//   const og = React.createElement
//   // @ts-ignore
//   React.createElement = (...args) => {
//     if (!args[0]) {
//       console.trace('Missing export, better stack trace here', !!args[0])
//     }
//     // @ts-ignore
//     return og(...args)
//   }

//   const og2 = JSX.jsx
//   // @ts-ignore
//   JSX.jsx = (...args) => {
//     if (!args[0]) {
//       console.trace('Missing export, better stack trace here', !!args[0])
//     }
//     // @ts-ignore
//     return og2(...args)
//   }
// }
