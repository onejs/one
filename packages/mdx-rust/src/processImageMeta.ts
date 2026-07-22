import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ImageMeta } from './types'

async function getSharp(): Promise<(typeof import('sharp'))['default'] | null> {
  try {
    const sharpModule = await import('sharp')
    return sharpModule.default
  } catch {
    return null
  }
}

/** Read an image's dimensions and a tiny blur placeholder. Null if sharp is
 *  not installed or the file is missing. */
export async function processImageMeta(
  imagePath: string,
  opts?: { publicDir?: string }
): Promise<ImageMeta | null> {
  const publicDir = opts?.publicDir ?? './public'
  const filePath = imagePath.startsWith('/')
    ? resolve(publicDir, imagePath.slice(1))
    : resolve(imagePath)

  if (!existsSync(filePath)) return null
  const sharp = await getSharp()
  if (!sharp) return null

  try {
    const image = sharp(filePath)
    const { width = 0, height = 0 } = await image.metadata()
    const blurBuffer = await image.resize(10).blur().jpeg({ quality: 40 }).toBuffer()
    const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`
    return { width, height, blurDataURL }
  } catch {
    return null
  }
}
