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

/** the key the entry's globs use: `./posts/[slug]+ssg.tsx` -> `/app/posts/[slug]+ssg.tsx` */
export function routeEntryKey(routerRoot: string, routeFile: string) {
  return `/${routerRoot}/${routeFile.replace(/^\.?\//, '')}`
}

/**
 * resolve one route's exports out of an already-loaded server entry namespace.
 * returns null when the entry has no such route.
 */
export async function getRouteExportsFromEntry(
  entry: any,
  routerRoot: string,
  routeFile: string
): Promise<Record<string, any> | null> {
  const key = routeEntryKey(routerRoot, routeFile)

  // a route that declares spa by filename or parent directory is stubbed out of
  // the route map, so the server never holds its page component. every stubbed
  // route has an entry in this parallel per-export map whether or not it
  // actually exports a loader, which is what tells a stub from a real route. a
  // route that is spa only because of `web.defaultRenderMode` is never stubbed.
  const spaExports = entry?.oneServerSpaRouteExports
  if (spaExports?.loader && key in spaExports.loader) {
    const [loader, loaderCache, generateStaticParams, sitemap] = await Promise.all([
      spaExports.loader[key](),
      spaExports.loaderCache?.[key]?.(),
      spaExports.generateStaticParams?.[key]?.(),
      spaExports.sitemap?.[key]?.(),
    ])
    return { loader, loaderCache, generateStaticParams, sitemap }
  }

  // some output formats nest the entry default one level deeper
  const app = entry?.default?.options ? entry.default : entry?.default?.default
  const importRoute = app?.options?.routes?.[key]
  return importRoute ? await importRoute() : null
}
