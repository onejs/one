// this is only run on native
function extractExactPathFromURL(url: string): string {
  if (
    // If a universal link / app link / web URL is used, we should use the path
    // from the URL, while stripping the origin.
    url.match(/^https?:\/\//)
  ) {
    const { origin, href } = new URL(url)

    return href.replace(origin, '')
  }

  return fromDeepLink(url)
}

function fromDeepLink(url: string): string {
  let res: URL | null
  try {
    // This is for all standard deep links, e.g. `foobar://` where everything
    // after the `://` is the path.
    res = new URL(url)
  } catch {
    /**
     * We failed to parse the URL. This can occur for a variety of reasons, including:
     * - Its a partial URL (e.g. `/route?query=param`).
     * - It has a valid App scheme, but the scheme isn't a valid URL scheme (e.g. `my_app://`)
     */

    // If `url` is already a path (starts with `/`), return it as-is
    // This prevents incorrect rewrites when URL is in query params (e.g. `/?url=https://example.com`)
    if (url.startsWith('/')) {
      return url
    }

    /**
     * App schemes are not valid URL schemes, so they will fail to parse.
     * We need to strip the scheme from these URLs
     */
    return url.replace(/^[^:]+:\/\//, '')
  }

  let results = ''

  if (res.host) {
    results += res.host
  }

  if (res.pathname) {
    results += res.pathname
  }

  const qs = !res.search
    ? ''
    : // @ts-ignore: `entries` is not on `URLSearchParams` in some typechecks.
      [...res.searchParams.entries()]
        .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
        .join('&')

  if (qs) {
    results += '?' + qs
  }

  return results
}

export function extractPathFromURL(_prefixes: string[], url = '') {
  const pathFromPrefix = extractPathFromPrefix(_prefixes, url)
  if (pathFromPrefix !== undefined) {
    return pathFromPrefix.replace(/^\//, '')
  }

  return (
    extractExactPathFromURL(url)
      // TODO: We should get rid of this, dropping specificities is not good
      .replace(/^\//, '')
  )
}

function extractPathFromPrefix(prefixes: string[] = [], url: string) {
  const prefix = getMatchingPrefix(prefixes, url)
  if (!prefix) return undefined

  return url.slice(prefix.length)
}

const PREFIX_BOUNDARY_CHARS = ['/', '?', '#']

function getMatchingPrefix(prefixes: string[], url: string) {
  return prefixes
    .filter((prefix) => matchesPrefix(prefix, url))
    .sort((a, b) => b.length - a.length)[0]
}

function matchesPrefix(prefix: string, url: string) {
  if (!url.startsWith(prefix)) return false
  if (url.length === prefix.length) return true
  // a prefix already ending in '/' has consumed its boundary
  if (prefix.endsWith('/')) return true
  return PREFIX_BOUNDARY_CHARS.includes(url[prefix.length])
}
