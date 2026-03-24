import { serveStatic } from '@hono/node-server/serve-static'
import type { Context } from 'hono'
import picomatch from 'picomatch'

// hashed assets can be cached forever, html must revalidate
const hashedAssetRe = /[.-](?=[a-zA-Z0-9_-]*\d)[a-zA-Z0-9_-]{8,}\.\w+$/

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
    const sources = patterns.map((p) => picomatch.makeRe(p).source)
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

  const response = await serveStatic({
    root: `./${outDir}/client`,
    onFound: (path, c) => {
      // single regex test for all custom rules
      if (cacheRules) {
        // strip leading / so globs like "*.wasm" and "deps-web/**" match naturally
        const p = path[0] === '/' ? path.slice(1) : path
        const m = cacheRules.re.exec(p)
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

      if (hashedAssetRe.test(path)) {
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
