import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

const IMAGEDATA_SUFFIX = '?imagedata'
const VIRTUAL_PREFIX = '\0imagedata:'

let sharpWarned = false

async function getSharp(): Promise<typeof import('sharp') | null> {
  try {
    // sharp can be default or named export depending on environment
    const sharpModule = await import('sharp')
    return (sharpModule as any).default || sharpModule
  } catch (e) {
    if (!sharpWarned) {
      sharpWarned = true
      console.warn(
        `\n[one] To use ?imagedata imports, install sharp:\n\n  npm install sharp\n`
      )
    }
    return null
  }
}

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

      const sharp = await getSharp()

      if (!sharp) {
        return createImageDataExport(src)
      }

      try {
        const image = sharp(filePath)
        const metadata = await image.metadata()
        const { width = 0, height = 0 } = metadata

        // Generate blur placeholder (10px wide, maintains aspect ratio)
        const blurBuffer = await image.resize(10).blur(1).jpeg({ quality: 40 }).toBuffer()
        const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

        return createImageDataExport(src, width, height, blurDataURL)
      } catch (e) {
        console.warn(`[one] ?imagedata: Failed to process ${filePath}:`, e)
        return createImageDataExport(src)
      }
    },
  }
}
