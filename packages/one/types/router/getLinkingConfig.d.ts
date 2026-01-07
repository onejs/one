import { type LinkingOptions } from '@react-navigation/native'
import { type Screen } from '../getReactNavigationConfig'
import { getPathFromState } from '../link/linking'
import type { RouteNode } from './Route'
export declare function getNavigationConfig(
  routes: RouteNode,
  metaOnly?: boolean
): {
  initialRouteName?: string
  screens: Record<string, Screen>
}
export type OneLinkingOptions = LinkingOptions<object> & {
  getPathFromState?: typeof getPathFromState
}
export declare function getLinkingConfig(
  routes: RouteNode,
  metaOnly?: boolean
): OneLinkingOptions
export declare const stateCache: Map<string, any>
//# sourceMappingURL=getLinkingConfig.d.ts.map
