import { serveStatic } from '@hono/node-server/serve-static'
import type { Context } from 'hono'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { getMimeType } from 'hono/utils/mime'
import micromatch from 'micromatch'

// hashed assets can be cached forever, html must revalidate
// vite/rolldown always puts content-hashed files in the assets/ directory
const assetsPathRe = /[\\/]assets[\\/]/
// fallback regex for hashed filenames outside assets/
const hashedAssetRe = /[.-](?=[a-zA-Z0-9_-]*\d)[a-zA-Z0-9_-]{8,}\.\w+$/
// strip a content-encoding suffix from a path
const precompressedSuffixRe = /\.(?:br|gz|zst)$/

// preference order matches hono's built-in: br > zstd > gzip.
// we use this manually (not hono's `precompressed: true`) because hono
// does not mtime-guard the sibling — it'll happily serve a stale .br
// against a newer source. our build pipeline regenerates siblings, but
// the runtime guard is the safety net.
const PRECOMPRESSED_ENCODINGS: Array<{ encoding: string; ext: string }> = [
  { encoding: 'br', ext: '.br' },
  { encoding: 'zstd', ext: '.zst' },
  { encoding: 'gzip', ext: '.gz' },
]

// mime types eligible for precompressed sibling serving. mirrors hono's
// COMPRESSIBLE_CONTENT_TYPE_REGEX behavior — only types where brotli/gzip
// give meaningful compression. images, video, woff2 etc. are already
// compressed and skipped.
const compressibleMimeRe =
  /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|wasm|x-javascript|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/svg\+xml|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i

// safe stat that returns undefined on error
function tryStat(path: string) {
  try {
    return statSync(path)
  } catch {
    return undefined
  }
}

// parse Accept-Encoding into a set of lowercase encodings the client accepts.
// ignores q-values (no real client uses q=0 to reject an encoding in practice).
function parseAcceptEncoding(header: string | undefined): Set<string> {
  if (!header) return new Set()
  const out = new Set<string>()
  for (const part of header.split(',')) {
    const enc = part.split(';')[0]?.trim().toLowerCase()
    if (enc) out.add(enc)
  }
  return out
}

/**
 * if the request maps to a file with a content-encoded sibling
 * (foo.js → foo.js.br) AND the sibling is at least as new as the source,
 * return { encoding, ext } so the caller can serve the sibling directly
 * with the right Content-Encoding header.
 *
 * stale siblings (mtime older than source) are deliberately skipped —
 * a build that produced new source without regenerating .br is buggy,
 * but we should never serve stale bytes as if they were fresh.
 */
function pickFreshSibling(
  sourceFsPath: string,
  acceptEncoding: string | undefined
): { encoding: string; ext: string } | undefined {
  const accepted = parseAcceptEncoding(acceptEncoding)
  if (accepted.size === 0) return undefined

  const sourceStat = tryStat(sourceFsPath)
  if (!sourceStat || !sourceStat.isFile()) return undefined

  // only serve precompressed for compressible types — same gate hono uses
  const mime = getMimeType(sourceFsPath)
  if (mime && !compressibleMimeRe.test(mime)) return undefined

  for (const candidate of PRECOMPRESSED_ENCODINGS) {
    if (!accepted.has(candidate.encoding)) continue
    const siblingStat = tryStat(sourceFsPath + candidate.ext)
    if (!siblingStat || !siblingStat.isFile()) continue
    // mtime guard: sibling must not predate the source. equal mtime is fine
    // (some build systems set both to the same timestamp).
    if (siblingStat.mtimeMs >= sourceStat.mtimeMs) {
      return candidate
    }
  }
  return undefined
}

export type CompiledCacheRules = { re: RegExp; values: string[] }

/**
 * compile a cacheControl config (glob → header) into a single regex.
 * each unique header value gets a capturing group — one regex.test()
 * per request, then the matched group index maps to the header value.
 */
export function compileCacheRules(
  cacheControl: Record<string, string>
): CompiledCacheRules {
  // group patterns by header value
  const groups = new Map<string, string[]>()
  for (const [pattern, value] of Object.entries(cacheControl)) {
    let arr = groups.get(value)
    if (!arr) {
      arr = []
      groups.set(value, arr)
    }
    arr.push(pattern)
  }

  // each group becomes a capturing group: (pat1|pat2)|(pat3)
  // matched group index → values[index]
  const values: string[] = []
  const groupSources: string[] = []

  for (const [value, patterns] of groups) {
    values.push(value)
    const sources = patterns.map((p) => micromatch.makeRe(p).source)
    groupSources.push(`(${sources.join('|')})`)
  }

  const re = new RegExp(groupSources.join('|'))
  return { re, values }
}

export async function serveStaticAssets({
  context,
  next,
  outDir = 'dist',
  cacheRules,
}: {
  context: Context
  next?: () => Promise<void>
  outDir?: string
  cacheRules?: CompiledCacheRules
}) {
  let didCallNext = false

  const root = `./${outDir}/client`
  // path.join normalizes "./" away, so pre-compute the normalized prefix
  const rootPrefix = `${outDir}/client/`

  // pick a precompressed sibling if one is fresh + accepted. resolved
  // relative to `root` so it matches what serveStatic will stat.
  const reqPath = context.req.path.replace(/^\/+/, '')
  const sibling = pickFreshSibling(
    join(root, reqPath),
    context.req.header('Accept-Encoding')
  )

  // when serving a sibling, the original mime is needed so onFound can
  // restore Content-Type after serveStatic's mime guess for ".br"/".gz".
  const originalMime = sibling ? getMimeType(reqPath) : undefined

  const response = await serveStatic({
    root,
    // when a fresh sibling exists, pin the served file to <path>.<ext>.
    // hono will stat that path and stream it as-is; we set the right
    // Content-Encoding + Content-Type in onFound.
    path: sibling ? reqPath + sibling.ext : undefined,
    onFound: (fsPath, c) => {
      // strip any encoding suffix so cache-rule patterns fire on the
      // original logical asset, not the .br/.gz/.zst variant
      const originalFsPath = fsPath.replace(precompressedSuffixRe, '')

      if (sibling) {
        c.header('Content-Encoding', sibling.encoding)
        c.header('Vary', 'Accept-Encoding', { append: true })
        // serveStatic set Content-Type from the .br extension (octet-stream
        // for unknown). restore the original mime.
        if (originalMime) {
          c.header('Content-Type', originalMime)
        }
      }

      // onFound receives the joined fs path (e.g. "dist/client/foo.js")
      // strip root prefix to get the URL-relative path for glob matching
      const path = originalFsPath.startsWith(rootPrefix)
        ? originalFsPath.slice(rootPrefix.length)
        : originalFsPath

      // single regex test for all custom rules
      if (cacheRules) {
        const m = cacheRules.re.exec(path)
        if (m) {
          // find which capturing group matched
          for (let i = 1; i < m.length; i++) {
            if (m[i] !== undefined) {
              c.header('Cache-Control', cacheRules.values[i - 1]!)
              return
            }
          }
        }
      }

      if (assetsPathRe.test(originalFsPath) || hashedAssetRe.test(originalFsPath)) {
        c.header('Cache-Control', 'public, immutable, max-age=31536000')
      } else {
        c.header('Cache-Control', 'public, max-age=0, must-revalidate')
      }
    },
  })(context, async () => {
    didCallNext = true
    await next?.()
  })

  if (!response || didCallNext) {
    return
  }

  return response
}
