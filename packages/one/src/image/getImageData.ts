import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type ImageData = {
  src: string
  width: number
  height: number
  blurDataURL: string
}

export type ImageMeta = {
  width: number
  height: number
  blurDataURL: string
}

let sharpWarned = false

export async function getSharp(): Promise<typeof import('sharp') | null> {
  try {
    const sharpModule = await import('sharp')
    return (sharpModule as any).default || sharpModule
  } catch (e) {
    if (!sharpWarned) {
      sharpWarned = true
      console.warn(`\n[one] To use getImageData, install sharp:\n\n  npm install sharp\n`)
    }
    return null
  }
}

/**
 * Process an image file and return its metadata.
 * Internal helper used by both getImageData and imageDataPlugin.
 */
export async function processImageMeta(filePath: string): Promise<ImageMeta | null> {
  const sharp = await getSharp()
  if (!sharp) {
    return null
  }

  try {
    const image = sharp(filePath)
    const metadata = await image.metadata()
    const { width = 0, height = 0 } = metadata

    // Generate blur placeholder (10px wide, maintains aspect ratio)
    const blurBuffer = await image.resize(10).blur(1).jpeg({ quality: 40 }).toBuffer()
    const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

    return { width, height, blurDataURL }
  } catch (e) {
    console.warn(`[one] processImageMeta: Failed to process ${filePath}:`, e)
    return null
  }
}

/**
 * Get image metadata (dimensions and blur placeholder) for an image file.
 *
 * @param filePath - Path to the image file. Paths starting with "/" are resolved
 *                   relative to ./public (e.g., "/images/hero.jpg" -> "./public/images/hero.jpg")
 * @returns ImageData with src, width, height, and blurDataURL
 *
 * @example
 * // From a loader or build script
 * const data = await getImageData('/images/hero.jpg')
 * // { src: '/images/hero.jpg', width: 1920, height: 1080, blurDataURL: '...' }
 *
 * // Or with a relative path
 * const data = await getImageData('../public/images/hero.jpg')
 */
export async function getImageData(filePath: string): Promise<ImageData> {
  let resolvedPath: string
  let src: string

  if (filePath.startsWith('/')) {
    // Paths starting with / are web paths, resolve from ./public
    resolvedPath = resolve('./public', filePath.slice(1))
    src = filePath
  } else {
    // Relative or absolute file paths
    resolvedPath = resolve(filePath)
    // Generate src by stripping leading ./ and ensuring starts with /
    src = filePath.replace(/^\.\.?\//, '').replace(/^public\//, '')
    if (!src.startsWith('/')) {
      src = '/' + src
    }
  }

  const defaultResult: ImageData = { src, width: 0, height: 0, blurDataURL: '' }

  if (!existsSync(resolvedPath)) {
    console.warn(`[one] getImageData: File not found: ${resolvedPath}`)
    return defaultResult
  }

  const meta = await processImageMeta(resolvedPath)
  if (!meta) {
    return defaultResult
  }

  return { src, ...meta }
}
