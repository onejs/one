import { relative } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Tracks CSS files with `.inline.css` extension.
 * These CSS files will be inlined as <style> tags before scripts.
 *
 * Usage:
 *   import './layout.inline.css'
 *
 * The plugin records which source CSS files should be inlined. After the build,
 * getCriticalCSSOutputPaths() maps source paths to output paths
 * using the client manifest.
 */

const INLINE_CSS_EXT = '.inline.css'

// source paths of CSS files with .inline.css extension (relative to root)
const criticalCSSSources = new Set<string>()

let root = ''

export function getCriticalCSSSources(): Set<string> {
  return criticalCSSSources
}

/**
 * Given the client manifest, returns the set of output CSS paths
 * that use .inline.css extension.
 */
export function getCriticalCSSOutputPaths(
  clientManifest: Record<string, { file: string; css?: string[] }>
): Set<string> {
  const outputPaths = new Set<string>()

  for (const [sourceKey, entry] of Object.entries(clientManifest)) {
    // direct CSS manifest entries: key is source path, entry.file is output
    if (sourceKey.endsWith('.css') && criticalCSSSources.has(sourceKey)) {
      outputPaths.add(`/${entry.file}`)
    }

    // also check if JS entries import critical CSS via their css array
    // by checking if the JS entry's source file imported any critical CSS
    // (this handles cssCodeSplit where CSS is grouped by chunk)
  }

  return outputPaths
}

export function criticalCSSPlugin(): Plugin {
  return {
    name: 'one:critical-css',
    enforce: 'pre',

    configResolved(config) {
      root = config.root
    },

    async resolveId(id, importer) {
      if (!id.endsWith(INLINE_CSS_EXT)) return null

      const resolved = await this.resolve(id, importer, { skipSelf: true })

      if (resolved) {
        // store as relative path to match manifest keys
        const relativePath = relative(root, resolved.id)
        criticalCSSSources.add(relativePath)
        return resolved
      }

      return null
    },
  }
}
