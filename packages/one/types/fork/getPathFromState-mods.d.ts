/**
 * This file exports things that will be used to modify the forked code in `getPathFromState.ts`.
 *
 * The purpose of keeping things in this separated file is to keep changes to the copied code as little as possible, making merging upstream updates easier.
 */
import type { Route } from '@react-navigation/core'
export type AdditionalOptions = {
  preserveDynamicRoutes?: boolean
  preserveGroups?: boolean
  shouldEncodeURISegment?: boolean
}
export type ConfigItemMods = {
  initialRouteName?: string
}
export declare function getPathWithConventionsCollapsed({
  pattern,
  route,
  params,
  preserveGroups,
  preserveDynamicRoutes,
  shouldEncodeURISegment,
  initialRouteName,
}: AdditionalOptions & {
  pattern: string
  route: Route<any>
  params: Record<string, any>
  initialRouteName?: string
}): string
export declare function appendBaseUrl(path: string, baseUrl?: string | undefined): string
//# sourceMappingURL=getPathFromState-mods.d.ts.map
