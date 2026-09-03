import { toAbsoluteUrl } from '../utils/toAbsolute'

/**
 * route modules have to be read through the built server entry's own route map,
 * never by importing whichever output chunk happens to contain them.
 *
 * a bundler makes no promise that a chunk re-exports a module's bindings under
 * their source names. when a route is both dynamically imported by the entry and
 * statically imported by another route (docs pages mirrored under a second url,
 * say), or when the app sets `output.strictExecutionOrder`, rolldown emits the
 * chunk as
 *
 *   export { loader as a, init__slug_ as i, _slug__exports as n, generateStaticParams as r }
 *
 * so every read by source name comes back undefined: the build then reports a
 * route that exports generateStaticParams as missing it, and any loader on that
 * route silently stops running.
 *
 * the entry's `import.meta.glob` map is written by the bundler itself, which
 * rewrites each entry to whatever preserves the real namespace
 * (`import(chunk).then((n) => (n.i(), n.n))` for the wrapped case above). so it
 * resolves correctly no matter how the chunking lands.
 */

type RouteModuleMap = Record<string, () => Promise<any>>

type ServerEntryRoutes = {
  routes: RouteModuleMap
  /**
   * a route that declares spa in its filename or a parent directory is stubbed
   * out of the map above so the server never holds its page component, and its
   * build-time exports come from this parallel map of per-export globs instead.
   * a route that is spa only because of `web.defaultRenderMode` is not stubbed
   * and stays in `routes`, so presence here is what tells the two apart.
   */
  spaBuildRoutes: Record<string, RouteModuleMap>
}

// entry evaluation is expensive and every page in a build shares it
const serverEntries = new Map<string, Promise<ServerEntryRoutes>>()

function loadServerEntry(serverEntry: string) {
  let loading = serverEntries.get(serverEntry)
  if (!loading) {
    loading = import(toAbsoluteUrl(serverEntry)).then((mod) => {
      // some output formats nest the entry default one level deeper
      const app = mod.default?.options ? mod.default : mod.default?.default
      const routes = app?.options?.routes
      if (!routes) {
        throw new Error(
          `[one] the built server entry exposes no route map: ${serverEntry}`
        )
      }
      return { routes, spaBuildRoutes: mod.oneBuildOnlySpaRoutes ?? {} }
    })
    serverEntries.set(serverEntry, loading)
  }
  return loading
}

export async function getRouteExports(
  serverEntry: string,
  routerRoot: string,
  routeFile: string
): Promise<Record<string, any>> {
  const { routes, spaBuildRoutes } = await loadServerEntry(serverEntry)
  // the key the entry's globs use, e.g. `./posts/[slug]+ssg.tsx` -> `/app/posts/[slug]+ssg.tsx`
  const key = `/${routerRoot}/${routeFile.replace(/^\.?\//, '')}`

  if (spaBuildRoutes.loader?.[key]) {
    const [loader, generateStaticParams, sitemap] = await Promise.all([
      spaBuildRoutes.loader[key](),
      spaBuildRoutes.generateStaticParams?.[key]?.(),
      spaBuildRoutes.sitemap?.[key]?.(),
    ])
    return { loader, generateStaticParams, sitemap }
  }

  const importRoute = routes[key]
  if (!importRoute) {
    throw new Error(
      `[one] route ${routeFile} is missing from the built server entry route map (looked for "${key}" in: ${Object.keys(routes).join(', ')})`
    )
  }

  return await importRoute()
}
