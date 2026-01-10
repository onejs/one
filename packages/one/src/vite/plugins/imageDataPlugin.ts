import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { processImageMeta } from '../../image/getImageData'

const IMAGEDATA_SUFFIX = '?imagedata'
const VIRTUAL_PREFIX = '\0imagedata:'

export function imageDataPlugin(): Plugin {
  let publicDir: string
  let root: string

  function getSrcPath(filePath: string): string {
    return filePath.startsWith(publicDir)
      ? '/' + relative(publicDir, filePath)
      : '/' + relative(root, filePath)
  }

  function isPathWithinBounds(filePath: string, allowedDir: string): boolean {
    const resolved = resolve(filePath)
    const allowed = resolve(allowedDir)
    return resolved.startsWith(allowed + '/') || resolved === allowed
  }

  function createImageDataExport(src: string, width = 0, height = 0, blurDataURL = '') {
    return `export default ${JSON.stringify({ src, width, height, blurDataURL })}`
  }

  return {
    name: 'one:imagedata',
    enforce: 'pre',

    configResolved(resolvedConfig: ResolvedConfig) {
      publicDir = resolvedConfig.publicDir
      root = resolvedConfig.root
    },

    async resolveId(id, importer) {
      if (!id.endsWith(IMAGEDATA_SUFFIX)) return null

      const cleanId = id.slice(0, -IMAGEDATA_SUFFIX.length)
      let filePath: string
      let allowedDir: string

      // Handle public dir paths (starting with /)
      if (cleanId.startsWith('/')) {
        filePath = resolve(publicDir, cleanId.slice(1))
        allowedDir = publicDir
      } else if (importer) {
        // Handle relative imports
        filePath = resolve(dirname(importer.replace(VIRTUAL_PREFIX, '')), cleanId)
        allowedDir = root
      } else {
        filePath = resolve(root, cleanId)
        allowedDir = root
      }

      // Security: prevent path traversal outside allowed directory
      if (!isPathWithinBounds(filePath, allowedDir)) {
        console.warn(`[one] ?imagedata: Path traversal blocked: ${cleanId}`)
        return null
      }

      if (!existsSync(filePath)) {
        console.warn(`[one] ?imagedata: File not found: ${filePath}`)
        return null
      }

      return VIRTUAL_PREFIX + filePath
    },

    async load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null

      const filePath = id.slice(VIRTUAL_PREFIX.length)
      const src = getSrcPath(filePath)

      // Track file for rebuild on change
      this.addWatchFile(filePath)

      const meta = await processImageMeta(filePath)
      if (!meta) {
        return createImageDataExport(src)
      }

      return createImageDataExport(src, meta.width, meta.height, meta.blurDataURL)
    },
  }
}
