/**
 * Copyright © 2023 Tamagui LLC.
 * Copyright © 2023 650 Industries.
 * Copyright © 2023 Vercel, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/vercel/next.js/blob/1df2686bc9964f1a86c444701fa5cbf178669833/packages/next/src/shared/lib/router/utils/route-regex.ts
 */
import type { RouteNode } from '../router/Route'
import type { RouteInfo } from '../vite/types'
export type OneRouterServerManifestV1Route<TRegex = string> = RouteInfo & {
  generated?: boolean
}
export type OneRouterServerManifestV1<TRegex = string> = {
  apiRoutes: OneRouterServerManifestV1Route<TRegex>[]
  middlewareRoutes: OneRouterServerManifestV1Route<TRegex>[]
  pageRoutes: OneRouterServerManifestV1Route<TRegex>[]
  allRoutes: OneRouterServerManifestV1Route<TRegex>[]
}
export interface Group {
  pos: number
  repeat: boolean
  optional: boolean
}
export interface RouteRegex {
  groups: Record<string, Group>
  re: RegExp
}
export declare function getServerManifest(route: RouteNode): OneRouterServerManifestV1
export declare function parseParam(param: string): {
  name: string
  repeat: boolean
  optional: boolean
}
//# sourceMappingURL=getServerManifest.d.ts.map
