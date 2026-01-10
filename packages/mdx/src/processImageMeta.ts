import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ImageMeta } from './types'

async function getSharp(): Promise<typeof import('sharp') | null> {
  try {
    const sharpModule = await import('sharp')
    return (sharpModule as any).default || sharpModule
  } catch {
    // silent fallback - no warning needed
    return null
  }
}

/**
 * Process an image file and return its metadata.
 * Returns null if sharp is not installed or processing fails.
 */
export async function processImageMeta(
  imagePath: string,
  opts?: { publicDir?: string }
): Promise<ImageMeta | null> {
  const publicDir = opts?.publicDir ?? './public'

  // Resolve the file path
  let filePath: string
  if (imagePath.startsWith('/')) {
    filePath = resolve(publicDir, imagePath.slice(1))
  } else {
    filePath = resolve(imagePath)
  }

  if (!existsSync(filePath)) {
    return null
  }

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
  } catch {
    return null
  }
}
