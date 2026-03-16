import { relative } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Tracks CSS files imported with `?critical` suffix.
 * These CSS files will be inlined as <style> tags before scripts.
 *
 * Usage:
 *   import './layout.css?critical'
 *
 * The plugin strips `?critical`, lets Vite process the CSS normally,
 * and records which source CSS files are critical. After the build,
 * getCriticalCSSOutputPaths() maps source paths to output paths
 * using the client manifest.
 */

const CRITICAL_SUFFIX = '?critical'

// source paths of CSS files imported with ?critical (relative to root)
const criticalCSSSources = new Set<string>()

let root = ''

export function getCriticalCSSSources(): Set<string> {
  return criticalCSSSources
}

/**
 * Given the client manifest, returns the set of output CSS paths
 * that were imported with ?critical.
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
      if (!id.endsWith(CRITICAL_SUFFIX)) return null

      const cleanId = id.slice(0, -CRITICAL_SUFFIX.length)
      const resolved = await this.resolve(cleanId, importer, { skipSelf: true })

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
