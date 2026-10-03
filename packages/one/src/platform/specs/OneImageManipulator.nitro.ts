import type { HybridObject } from 'react-native-nitro-modules'

export type OneImageFormat = 'jpeg' | 'png'

export interface ImageCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageResize {
  width?: number
  height?: number
}

export interface ImageTransformOptions {
  crop?: ImageCrop
  resize?: ImageResize
  rotate?: number
  format: OneImageFormat
  quality?: number
}

export interface ImageTransformResult {
  uri: string
  width: number
  height: number
  size: number
}

export interface OneImageManipulator extends HybridObject<{ ios: 'swift' }> {
  transform(uri: string, options: ImageTransformOptions): Promise<ImageTransformResult>
}
