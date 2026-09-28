import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  ImageTransformOptions,
  ImageTransformResult,
  OneImageManipulator,
} from '../specs/OneImageManipulator.nitro'

export type { ImageCrop, OneImageFormat as ImageFormat, ImageResize, ImageTransformResult } from '../specs/OneImageManipulator.nitro'

export type ImageManipulatorOptions = Omit<ImageTransformOptions, 'format'> & {
  format?: ImageTransformOptions['format']
}

let hybrid: OneImageManipulator | undefined

function native(): OneImageManipulator {
  if (Platform.OS !== 'ios') throw new Error('ImageManipulator requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneImageManipulator>('OneImageManipulator')
  return hybrid
}

function transform(uri: string, options: ImageManipulatorOptions = {}): Promise<ImageTransformResult> {
  return native().transform(uri, { ...options, format: options.format ?? 'jpeg' }).catch(rethrowNativeError)
}

export const ImageManipulator = Object.freeze({ transform })
