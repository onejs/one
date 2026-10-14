import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  ImageTransformOptions,
  ImageTransformResult,
  OneImageManipulator,
} from '../specs/OneImageManipulator.nitro'

export type {
  ImageCrop,
  OneImageFlip as ImageFlip,
  OneImageFormat as ImageFormat,
  ImageResize,
  ImageTransformResult,
} from '../specs/OneImageManipulator.nitro'

export type ImageManipulatorOptions = Omit<ImageTransformOptions, 'format'> & {
  format?: ImageTransformOptions['format']
}

let hybrid: OneImageManipulator | undefined

function native(): OneImageManipulator {
  hybrid ??= NitroModules.createHybridObject<OneImageManipulator>('OneImageManipulator')
  return hybrid
}

function transform(
  uri: string,
  options: ImageManipulatorOptions = {}
): Promise<ImageTransformResult> {
  if (options.flip != null && options.flip !== 'horizontal' && options.flip !== 'vertical')
    throw new Error("ImageManipulator.transform: flip must be 'horizontal' or 'vertical'")
  return native()
    .transform(uri, { ...options, format: options.format ?? 'jpeg' })
    .catch(rethrowNativeError)
}

export const ImageManipulator = Object.freeze({ transform })
