import type { HybridObject } from 'react-native-nitro-modules'

export type OneImageFormat = 'jpeg' | 'png' | 'webp'

export type OneImageFlip = 'horizontal' | 'vertical'

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
  flip?: OneImageFlip
  format: OneImageFormat
  quality?: number
}

export interface ImageTransformResult {
  uri: string
  width: number
  height: number
  size: number
}

export interface OneImageManipulator extends HybridObject<{
  ios: 'swift'
  android: 'kotlin'
}> {
  transform(uri: string, options: ImageTransformOptions): Promise<ImageTransformResult>
}
