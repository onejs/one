import micromatch from 'micromatch'
import path from 'node:path'
import { globDir } from './globDir'
import { isPathInsideDirectory, isRouteFilePath } from './routeFileWatch'

export function getRoutePaths(
  routerRoot: string,
  ignoredRouteFiles?: string[]
): string[] {
  const routePaths = globDir(routerRoot).filter(
    (routePath) => !routePath.endsWith('.d.ts')
  )
  if (!ignoredRouteFiles?.length) return routePaths
  return micromatch.not(routePaths, ignoredRouteFiles, { matchBase: true }) as string[]
}

export function createRouteIndex({
  routerRoot,
  ignoredRouteFiles,
}: {
  routerRoot: string
  ignoredRouteFiles?: string[]
}) {
  const absoluteRouterRoot = path.resolve(routerRoot)
  const routePaths = new Set(getRoutePaths(absoluteRouterRoot, ignoredRouteFiles))

  return {
    getPaths() {
      return [...routePaths].sort()
    },

    update(event: string, filePath: string) {
      if (event !== 'add' && event !== 'delete' && event !== 'unlink') return false
      if (!isPathInsideDirectory(filePath, absoluteRouterRoot)) return false
      if (!isRouteFilePath(filePath)) return false

      const relativePath = path
        .relative(absoluteRouterRoot, path.resolve(filePath))
        .replaceAll('\\', '/')
      const routePath = `./${relativePath}`
      if (
        ignoredRouteFiles?.length &&
        micromatch.isMatch(routePath, ignoredRouteFiles, { matchBase: true })
      ) {
        return false
      }

      if (event === 'add') {
        const size = routePaths.size
        routePaths.add(routePath)
        return routePaths.size !== size
      }

      return routePaths.delete(routePath)
    },
  }
}

export type RouteIndex = ReturnType<typeof createRouteIndex>
