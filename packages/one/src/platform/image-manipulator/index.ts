import { missingNativeBuild } from '../nativeError'
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

function pixels(value: number, zero = false): number {
  if (!Number.isInteger(value) || value < (zero ? 0 : 1) || value > 100_000)
    throw new Error('ImageManipulator.transform: expected a whole pixel count')
  return value
}
function size(width: number, height: number): void {
  if (width > 10_000 || height > 10_000 || width * height > 25_000_000)
    throw new Error(
      'ImageManipulator.transform: output is limited to 25 megapixels and 10,000 pixels per side'
    )
}

async function transform(
  uri: string,
  options: ImageManipulatorOptions = {}
): Promise<ImageTransformResult> {
  if (typeof window === 'undefined')
    throw missingNativeBuild('ImageManipulator.transform')
  const { crop, resize, rotate = 0, format = 'jpeg', quality } = options
  if (!['jpeg', 'png'].includes(format) || ![0, 90, 180, 270].includes(rotate))
    throw new Error('ImageManipulator.transform: invalid format or rotation')
  if (
    (format === 'png' && quality != null) ||
    (quality != null && (!Number.isFinite(quality) || quality < 0 || quality > 1))
  )
    throw new Error(
      'ImageManipulator.transform: quality applies only to JPEG and must be between 0 and 1'
    )
  const image = new window.Image()
  image.crossOrigin = 'anonymous'
  image.src = uri
  await image.decode()
  const x = pixels(crop?.x ?? 0, true),
    y = pixels(crop?.y ?? 0, true)
  const cw = pixels(crop?.width ?? image.naturalWidth),
    ch = pixels(crop?.height ?? image.naturalHeight)
  if (x + cw > image.naturalWidth || y + ch > image.naturalHeight)
    throw new Error('ImageManipulator.transform: crop must fit inside the source image')
  if (resize && resize.width == null && resize.height == null)
    throw new Error('ImageManipulator.transform: resize needs a width or height')
  let width = resize?.width == null ? cw : pixels(resize.width)
  let height = resize?.height == null ? ch : pixels(resize.height)
  if (resize?.width == null && resize?.height != null)
    width = Math.max(1, Math.round((cw * height) / ch))
  if (resize?.height == null && resize?.width != null)
    height = Math.max(1, Math.round((ch * width) / cw))
  size(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = rotate === 90 || rotate === 270 ? height : width
  canvas.height = rotate === 90 || rotate === 270 ? width : height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('ImageManipulator.transform: canvas is unavailable')
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((rotate * Math.PI) / 180)
  let source: CanvasImageSource = image
  if (crop) {
    const cropped = document.createElement('canvas')
    cropped.width = cw
    cropped.height = ch
    const cropContext = cropped.getContext('2d')
    if (!cropContext) throw new Error('ImageManipulator.transform: canvas is unavailable')
    cropContext.drawImage(image, x, y, cw, ch, 0, 0, cw, ch)
    source = cropped
  }
  context.drawImage(source, -width / 2, -height / 2, width, height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error('ImageManipulator.transform: encoding failed')),
      `image/${format}`,
      quality ?? 0.9
    )
  )
  return {
    uri: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
  }
}
export const ImageManipulator = Object.freeze({ transform })
