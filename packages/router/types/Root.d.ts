import { type ExpoRootProps } from '../src/ExpoRoot'
import type { GlobbedRouteImports } from '../src/types'
type RootProps = Omit<ExpoRootProps, 'context'> & {
  routes: GlobbedRouteImports
  path?: string
}
export declare function Root(props: RootProps): import('react/jsx-runtime').JSX.Element
export {}
//# sourceMappingURL=Root.d.ts.map
