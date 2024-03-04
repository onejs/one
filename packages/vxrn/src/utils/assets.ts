import { imageSize } from 'image-size'

export const SCALABLE_ASSETS = [
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'psd',
  'svg',
  'webp',
  'tiff',
]

export interface ImageSize {
  width?: number
  height?: number
}

export function getImageSize(resourcePath: string): ImageSize {
  try {
    let { width, height } = imageSize(resourcePath)

    return { width, height }
  } catch {
    return {
      width: 0,
      height: 0,
    }
  }
}
