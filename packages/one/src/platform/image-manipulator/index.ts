import type {
  ImageTransformOptions,
  ImageTransformResult,
} from '../specs/OneImageManipulator.nitro'

export type {
  ImageCrop,
  OneImageFormat as ImageFormat,
  ImageResize,
  ImageTransformResult,
} from '../specs/OneImageManipulator.nitro'

export type ImageManipulatorOptions = Omit<ImageTransformOptions, 'format'> & {
  format?: ImageTransformOptions['format']
}

export const ImageManipulator = Object.freeze({
  transform: (
    _uri: string,
    _options: ImageManipulatorOptions = {}
  ): Promise<ImageTransformResult> => {
    throw new Error('ImageManipulator requires an iOS or Android native build')
  },
})
