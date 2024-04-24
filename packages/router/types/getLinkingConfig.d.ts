import { type LinkingOptions } from '@react-navigation/native'
import type { RouteNode } from '../src/Route'
import { type Screen } from '../src/getReactNavigationConfig'
import { getPathFromState } from '../src/link/linking'
export declare function getNavigationConfig(
  routes: RouteNode,
  metaOnly?: boolean
): {
  initialRouteName?: string
  screens: Record<string, Screen>
}
export type ExpoLinkingOptions = LinkingOptions<object> & {
  getPathFromState?: typeof getPathFromState
}
export declare function getLinkingConfig(routes: RouteNode, metaOnly?: boolean): ExpoLinkingOptions
export declare const stateCache: Map<string, any>
//# sourceMappingURL=getLinkingConfig.d.ts.map
