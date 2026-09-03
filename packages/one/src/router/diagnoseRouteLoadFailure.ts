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
// from the browser finds the exact module the blocker refused. dev only, and
// only after a route has already failed to load.

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

/**
 * Walks the module graph under `entryUrl` looking for a module the browser
 * refuses to fetch. Returns the blocked module's url, or null when every
 * module in the graph is reachable (which means the import failed for some
 * other reason, such as a syntax error inside one of them).
 */
export async function findBlockedModule(entryUrl: string): Promise<string | null> {
  const deadline = Date.now() + TIMEOUT_MS
  const seen = new Set<string>()
  let frontier = [new URL(entryUrl, window.location.href).href]

  while (frontier.length && seen.size < MAX_MODULES && Date.now() < deadline) {
    const batch = frontier.filter((url) => !seen.has(url)).slice(0, 32)
    if (!batch.length) break
    frontier = frontier.slice(batch.length)

    const results = await Promise.all(
      batch.map(async (url) => {
        seen.add(url)
        let res: Response
        try {
          res = await fetch(url)
        } catch {
          // the request never reached the server. in dev the server is
          // demonstrably up (the page and one's own runtime loaded from it),
          // so this is the browser refusing to make the request.
          return { url, blocked: true, imports: [] as string[] }
        }
        if (!res.ok) return { url, blocked: false, imports: [] }
        const type = res.headers.get('content-type') ?? ''
        if (!type.includes('javascript')) return { url, blocked: false, imports: [] }
        return { url, blocked: false, imports: collectImports(await res.text(), url) }
      })
    )

    for (const result of results) {
      if (result.blocked) return result.url
      for (const next of result.imports) {
        if (!seen.has(next)) frontier.push(next)
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
  const blocked = await findBlockedModule(routeUrl)
  if (!blocked) return null

  const path = blocked.replace(window.location.origin, '')
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
