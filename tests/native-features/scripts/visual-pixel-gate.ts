import fs from 'node:fs'
import { PNG } from 'pngjs'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
  /**
   * If true, coordinates are already in device pixels.
   * If false or undefined, coordinates are in logical points (scaled by image.width / 393).
   */
  isPixel?: boolean
}

export interface PixelBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const decodedPngCache = new Map<string, PNG>()

export function clearPngCache(): void {
  decodedPngCache.clear()
}

export function readPng(imagePath: string): PNG {
  let image = decodedPngCache.get(imagePath)
  if (!image) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Screenshot not found at ${imagePath}`)
    }
    image = PNG.sync.read(fs.readFileSync(imagePath))
    decodedPngCache.set(imagePath, image)
  }
  return image
}

export function toPixelBounds(image: PNG, region: Rect): PixelBounds {
  const scale = region.isPixel ? 1 : image.width / 393
  const left = Math.max(0, Math.floor(region.x * scale))
  const top = Math.max(0, Math.floor(region.y * scale))
  const right = Math.min(image.width, Math.ceil((region.x + region.width) * scale))
  const bottom = Math.min(image.height, Math.ceil((region.y + region.height) * scale))
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

export function extractCrop(image: PNG, region: Rect): PNG {
  const bounds = toPixelBounds(image, region)
  const crop = new PNG({ width: bounds.width, height: bounds.height })
  for (let row = 0; row < bounds.height; row++) {
    const srcStart = ((bounds.top + row) * image.width + bounds.left) * 4
    const dstStart = row * bounds.width * 4
    image.data.copy(crop.data, dstStart, srcStart, srcStart + bounds.width * 4)
  }
  return crop
}

export function saveCrop(image: PNG, region: Rect, targetPath: string): void {
  const crop = extractCrop(image, region)
  const buffer = PNG.sync.write(crop)
  fs.writeFileSync(targetPath, buffer)
}

/**
 * Counts how many pixels changed inside the region between firstPath and secondPath.
 * Proves that the declared crop actually intersects the subject being tested (Rule 2).
 */
export function countChangedPixels(
  firstPath: string,
  secondPath: string,
  region: Rect,
  channelThreshold = 20
): { changed: number; total: number; ratio: number } {
  const first = readPng(firstPath)
  const second = readPng(secondPath)
  if (first.width !== second.width || first.height !== second.height) {
    throw new Error(
      `Images have differing dimensions: ${first.width}x${first.height} vs ${second.width}x${second.height}`
    )
  }

  const bounds = toPixelBounds(first, region)
  let changed = 0
  const total = bounds.width * bounds.height

  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const idx = (y * first.width + x) * 4
      const diff =
        Math.abs(first.data[idx] - second.data[idx]) +
        Math.abs(first.data[idx + 1] - second.data[idx + 1]) +
        Math.abs(first.data[idx + 2] - second.data[idx + 2])
      if (diff > channelThreshold) {
        changed++
      }
    }
  }

  return { changed, total, ratio: total > 0 ? changed / total : 0 }
}

/**
 * Measures ink / non-flat pixels inside a region by finding the dominant background color
 * and counting pixels that deviate from it. Separates a real rendered control from
 * an empty/flat surface.
 */
export function countInkPixels(
  imagePath: string,
  region: Rect,
  channelDistance = 24
): { ink: number; total: number; background: [number, number, number] } {
  const image = readPng(imagePath)
  const bounds = toPixelBounds(image, region)
  const total = bounds.width * bounds.height
  const counts = new Map<number, number>()

  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const idx = (y * image.width + x) * 4
      const key =
        (image.data[idx] << 16) | (image.data[idx + 1] << 8) | image.data[idx + 2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  let dominantColor = 0
  let maxCount = -1
  for (const [color, count] of counts) {
    if (count > maxCount) {
      dominantColor = color
      maxCount = count
    }
  }

  const bgR = (dominantColor >> 16) & 0xff
  const bgG = (dominantColor >> 8) & 0xff
  const bgB = dominantColor & 0xff

  let ink = 0
  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const idx = (y * image.width + x) * 4
      const dist =
        Math.abs(image.data[idx] - bgR) +
        Math.abs(image.data[idx + 1] - bgG) +
        Math.abs(image.data[idx + 2] - bgB)
      if (dist > channelDistance) {
        ink++
      }
    }
  }

  return { ink, total, background: [bgR, bgG, bgB] }
}

/**
 * Counts distinct 24-bit RGB colors within a region.
 * A flat unrendered region has 1 (or very few) colors.
 * A rendered control with anti-aliasing, borders, text has dozens or hundreds of distinct colors.
 */
export function countDistinctColors(imagePath: string, region: Rect): number {
  const image = readPng(imagePath)
  const bounds = toPixelBounds(image, region)
  const colors = new Set<number>()

  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const idx = (y * image.width + x) * 4
      colors.add(
        (image.data[idx] << 16) | (image.data[idx + 1] << 8) | image.data[idx + 2]
      )
    }
  }

  return colors.size
}

/**
 * Counts distinct 24-bit RGB colors directly within a cropped PNG.
 */
export function countDistinctColorsInCrop(crop: PNG): number {
  const colors = new Set<number>()
  for (let i = 0; i < crop.data.length; i += 4) {
    colors.add((crop.data[i] << 16) | (crop.data[i + 1] << 8) | crop.data[i + 2])
  }
  return colors.size
}

/**
 * Counts pixels inside a cropped PNG satisfying a predicate function.
 * Enables fast, subject-specific directional measurements with zero variance.
 */
export function countMatchingPixels(
  crop: PNG,
  predicate: (r: number, g: number, b: number, a: number, x: number, y: number) => boolean
): number {
  let count = 0
  for (let y = 0; y < crop.height; y++) {
    for (let x = 0; x < crop.width; x++) {
      const idx = (y * crop.width + x) * 4
      if (
        predicate(
          crop.data[idx],
          crop.data[idx + 1],
          crop.data[idx + 2],
          crop.data[idx + 3],
          x,
          y
        )
      ) {
        count++
      }
    }
  }
  return count
}
