// shared argument checks: identical checks and messages on web and native.
import type {
  ClipboardGetImageOptions,
  ClipboardGetStringOptions,
  ClipboardSetStringOptions,
} from './types'

export function assertSetStringText(text: unknown): asserts text is string {
  if (typeof text !== 'string') {
    throw new Error('Clipboard.setString: text must be a string')
  }
}

export function assertSetStringOptions(
  options: ClipboardSetStringOptions | undefined,
  verb: string
): void {
  if (options === undefined) return
  if (!options || typeof options !== 'object') {
    throw new Error(`Clipboard.${verb}: options must be an object`)
  }
  if (
    options.inputFormat !== undefined &&
    options.inputFormat !== 'plainText' &&
    options.inputFormat !== 'html'
  ) {
    throw new Error(
      `Clipboard.${verb}: inputFormat must be 'plainText' or 'html'`
    )
  }
}

export function assertGetStringOptions(
  options: ClipboardGetStringOptions | undefined,
  verb: string
): void {
  if (options === undefined) return
  if (!options || typeof options !== 'object') {
    throw new Error(`Clipboard.${verb}: options must be an object`)
  }
  if (
    options.preferredFormat !== undefined &&
    options.preferredFormat !== 'plainText' &&
    options.preferredFormat !== 'html'
  ) {
    throw new Error(
      `Clipboard.${verb}: preferredFormat must be 'plainText' or 'html'`
    )
  }
}

export function assertSetImage(base64Image: unknown): asserts base64Image is string {
  if (typeof base64Image !== 'string' || base64Image.length === 0) {
    throw new Error('Clipboard.setImage: base64Image must be a non-empty string')
  }
}

export function assertGetImageOptions(
  options: ClipboardGetImageOptions
): void {
  if (!options || typeof options !== 'object') {
    throw new Error('Clipboard.getImage: options must be an object')
  }
  if (options.format !== 'png' && options.format !== 'jpeg') {
    throw new Error(`Clipboard.getImage: format must be 'png' or 'jpeg'`)
  }
  if (options.jpegQuality !== undefined) {
    if (
      typeof options.jpegQuality !== 'number' ||
      Number.isNaN(options.jpegQuality) ||
      options.jpegQuality < 0 ||
      options.jpegQuality > 1
    ) {
      throw new Error('Clipboard.getImage: jpegQuality must be a number from 0 to 1')
    }
  }
}

export function assertSetUrl(url: unknown): asserts url is string {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Clipboard.setUrl: url must be a non-empty string')
  }
}

export function assertListener(
  listener: unknown
): asserts listener is (event: { contentTypes: string[] }) => void {
  if (typeof listener !== 'function') {
    throw new Error('Clipboard.addListener: listener must be a function')
  }
}
