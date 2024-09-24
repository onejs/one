import { type Options, getRoutes } from '../getRoutes'
import { getServerManifest } from './getServerManifest'
import type { RouteNode } from '../Route'
import type { VXS } from '../vite/types'

export { type Options } from '../getRoutes'

export type RouteInfo<TRegex = string> = {
  file: string
  page: string
  namedRegex: TRegex
  routeKeys: Record<string, string>
  layouts?: RouteNode[]
  type: VXS.RouteType
}

export type RoutesManifest<TRegex = string> = {
  apiRoutes: RouteInfo<TRegex>[]
  pageRoutes: RouteInfo<TRegex>[]
}

function createMockModuleWithContext(map: string[] = []) {
  const contextModule = (key) => ({ default() {} })

  Object.defineProperty(contextModule, 'keys', {
    value: () => map,
  })

  return contextModule as VXS.RouteContext
}

export function createRoutesManifest(paths: string[], options: Options): RoutesManifest | null {
  const routeTree = getRoutes(createMockModuleWithContext(paths), {
    ...options,
    preserveApiRoutes: true,
    ignoreRequireErrors: true,
    ignoreEntryPoints: true,
    platform: 'web',
  })

  if (!routeTree) {
    throw new Error(`No route tree found in paths: ${JSON.stringify(paths)}`)
  }

  return getServerManifest(routeTree)
}
