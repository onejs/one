import { createHash } from 'node:crypto'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import { CSS_PRELOAD_JS_POSTFIX } from '../constants'
import type { One } from '../vite/types'

// Convert URL path (with forward slashes) to filesystem path for cross-platform compatibility
export function urlPathToFilePath(urlPath: string): string {
  // Remove leading slash and split by forward slash (URL separator)
  const parts = urlPath.replace(/^\//, '').split('/')
  return join(...parts)
}

// Static routes that share the same layout, page module and CSS import graph
// generate byte-identical preload modules under different route filenames.
// The site builds one per URL, so generated docs and native pages upload or
// serve dozens of copies of the same module. Keep the first file as the
// canonical module and point the rest at it with a tiny import or re-export.
// The route filenames remain in place because the client derives the preload
// URL from the requested path, so no runtime lookup changes.
export async function dedupePreloadArtifacts(
  clientDir: string,
  routes: Pick<One.RouteBuildInfo, 'preloadPath' | 'cssPreloadPath'>[]
): Promise<number> {
  const files = new Set<string>()
  for (const route of routes) {
    files.add(route.preloadPath)
    files.add(route.cssPreloadPath)
  }

  const groups = new Map<string, string[]>()
  for (const urlPath of files) {
    const filePath = join(clientDir, urlPathToFilePath(urlPath))
    let content: string
    try {
      content = await FSExtra.readFile(filePath, 'utf8')
    } catch {
      continue
    }
    const hash = createHash('sha256').update(content).digest('hex')
    // Keep the artifact kinds in separate groups: a css-preload module exports
    // the inject functions while a route-preload module runs registrations, so
    // an import stub is only valid within one kind.
    const kind = urlPath.endsWith(CSS_PRELOAD_JS_POSTFIX) ? 'css' : 'js'
    const key = `${kind}:${hash}`
    const group = groups.get(key)
    if (group) {
      group.push(urlPath)
    } else {
      groups.set(key, [urlPath])
    }
  }

  let deduped = 0
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const [canonical, ...duplicates] = group
    const stub = canonical.endsWith(CSS_PRELOAD_JS_POSTFIX)
      ? `export * from ${JSON.stringify(canonical)}\n`
      : `import ${JSON.stringify(canonical)}\n`
    for (const duplicate of duplicates) {
      await FSExtra.writeFile(join(clientDir, urlPathToFilePath(duplicate)), stub)
      deduped++
    }
  }
  return deduped
}
