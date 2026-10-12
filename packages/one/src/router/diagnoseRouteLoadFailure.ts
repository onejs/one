// a browser content blocker (safari's built-in blockers, ublock, adguard,
// brave shields) matches filter rules against the request url. in dev the
// vite module url mirrors the source path, so an ordinary app file can match
// a tracking rule purely by where it lives — easylist, easyprivacy and
// adguard all ship the plain substring rule `/analytics/pageview`, which is
// enough to refuse `src/features/site/analytics/PageviewTracker.tsx`.
//
// one blocked module fails the whole dynamic import, and the browser reports
// only `TypeError: Importing a module script failed` pointing at one's own
// route loader. nothing in that names the file, the app, or the blocker, so
// it reads as a framework or vite bug and sends people restarting dev servers
// and clearing caches.
//
// a blocked request also fails `fetch()`, so walking the route's module graph
// from the browser finds the exact module the blocker refused. the same walk
// names a module the dev server answers 404 for, which the browser reports just
// as vaguely: an import of a file that was never written. dev only, and only
// after a route has already failed to load.

const MAX_MODULES = 500
const TIMEOUT_MS = 5000

// vite rewrites bare specifiers to absolute paths, so most of these are
// already root-relative; the rest resolve against the importing module.
function collectImports(source: string, base: string): string[] {
  const out: string[] = []
  const add = (spec: string) => {
    if (!/^[./]|^https?:/.test(spec)) return
    try {
      out.push(new URL(spec, base).href)
    } catch {}
  }
  for (const m of source.matchAll(
    /(?:^|[\s;}])(?:import|export)[^'"]{0,300}?from\s*["']([^"']+)["']/g
  ))
    add(m[1])
  for (const m of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) add(m[1])
  for (const m of source.matchAll(/(?:^|[\s;}])import\s*["']([^"']+)["']/g)) add(m[1])
  return out
}

export type RouteLoadFault =
  // the browser refused the request: it never reached the dev server
  | { kind: 'blocked'; url: string }
  // the dev server answered 404: a module imports a file that does not exist
  | { kind: 'missing'; url: string; importer: string | null }

/**
 * Walks the module graph under `entryUrl` looking for a module that cannot
 * load: one the dev server answers 404 for, or one the browser refuses to
 * fetch. Returns null when every module in the graph is reachable (which means
 * the import failed for some other reason, such as a syntax error inside one
 * of them).
 */
export async function findRouteLoadFault(entryUrl: string): Promise<RouteLoadFault | null> {
  const deadline = Date.now() + TIMEOUT_MS
  const importers = new Map<string, string | null>()
  const entry = new URL(entryUrl, window.location.href).href
  importers.set(entry, null)
  let frontier = [entry]
  let visited = 0

  while (frontier.length && visited < MAX_MODULES && Date.now() < deadline) {
    const batch = frontier.slice(0, 32)
    frontier = frontier.slice(batch.length)
    visited += batch.length

    const results = await Promise.all(
      batch.map(async (url) => {
        let res: Response
        try {
          res = await fetch(url)
        } catch {
          return { url, fault: 'unreachable' as const, imports: [] as string[] }
        }
        if (res.status === 404) return { url, fault: 'missing' as const, imports: [] }
        if (!res.ok) return { url, fault: null, imports: [] }
        const type = res.headers.get('content-type') ?? ''
        if (!type.includes('javascript')) return { url, fault: null, imports: [] }
        return { url, fault: null, imports: collectImports(await res.text(), url) }
      })
    )

    for (const result of results) {
      if (result.fault === 'missing') {
        // prebundled dependencies resolve their own imports, and the regex scan
        // can match import-shaped text inside their strings, so a 404 counts
        // only when app source asked for it.
        const importer = importers.get(result.url) ?? null
        if (importer?.includes('/node_modules/')) continue
        return { kind: 'missing', url: result.url, importer }
      }
      if (result.fault === 'unreachable') {
        // a request that never reached the server is a blocker only while the
        // server still answers: a page tearing down or a dev server going away
        // fails every fetch the same way.
        const serverAnswers = await fetch(window.location.href, { method: 'HEAD' }).then(
          () => true,
          () => false
        )
        return serverAnswers ? { kind: 'blocked', url: result.url } : null
      }
      for (const next of result.imports) {
        if (importers.has(next)) continue
        importers.set(next, result.url)
        frontier.push(next)
      }
    }
  }

  return null
}

/**
 * Turns a failed route import into a message that names the responsible file.
 * Returns null when the graph is fully reachable, leaving the original error
 * as the only report.
 */
export async function diagnoseRouteLoadFailure(
  routeId: string,
  routeUrl: string
): Promise<string | null> {
  const fault = await findRouteLoadFault(routeUrl)
  if (!fault) return null

  const toPath = (url: string) => url.replace(window.location.origin, '')
  const path = toPath(fault.url)

  if (fault.kind === 'missing') {
    return [
      `Route "${routeId}" failed to load because ${path} does not exist (the dev server answered 404).`,
      ``,
      fault.importer
        ? `${toPath(fault.importer)} imports it. Create the file or remove the import.`
        : `Create the file or remove the import.`,
    ].join('\n')
  }

  return [
    `Route "${routeId}" failed to load because this browser refused to fetch ${path}`,
    ``,
    `That request never reached the dev server, so a content blocker or privacy`,
    `extension is blocking it. In dev the module URL is the source path, and a`,
    `path containing a word like "analytics", "pageview" or "track" matches the`,
    `tracking rules those blockers ship.`,
    ``,
    `Rename the file or the directory so its path no longer matches, or allow`,
    `${window.location.origin} in the blocker.`,
  ].join('\n')
}
