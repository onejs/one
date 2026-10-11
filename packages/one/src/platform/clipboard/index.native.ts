import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  ClipboardGetImageOptions as NativeImageOptions,
  ClipboardGetStringOptions as NativeGetStringOptions,
  ClipboardSetStringOptions as NativeSetStringOptions,
  OneClipboard as NativeClipboard,
} from '../specs/OneClipboard.nitro'
import type {
  ClipboardContentType,
  ClipboardEvent,
  ClipboardGetImageOptions,
  ClipboardGetStringOptions,
  ClipboardImage,
  ClipboardSetStringOptions,
  ClipboardSubscription,
} from './types'
import {
  assertGetImageOptions,
  assertGetStringOptions,
  assertListener,
  assertSetImage,
  assertSetStringOptions,
  assertSetStringText,
  assertSetUrl,
} from './validate'

export type * from './types'

// clipboard matching expo-clipboard, backed by the OneClipboard nitro
// hybrid object (created on first use and cached). native owns all
// behavior. url methods are ios-only in expo: on android they resolve the
// empty value, so shared code needs no Platform.OS check.
let hybrid: NativeClipboard | undefined

function native(): NativeClipboard {
  hybrid ??= NitroModules.createHybridObject<NativeClipboard>('OneClipboard')
  return hybrid
}

function getString(options?: ClipboardGetStringOptions): Promise<string> {
  assertGetStringOptions(options, 'getString')
  const nativeOptions: NativeGetStringOptions = {}
  if (options?.preferredFormat !== undefined) {
    nativeOptions.preferredFormat = options.preferredFormat
  }
  return native().getString(nativeOptions).catch(rethrowNativeError)
}

function setString(text: string, options?: ClipboardSetStringOptions): Promise<boolean> {
  assertSetStringText(text)
  assertSetStringOptions(options, 'setString')
  const nativeOptions: NativeSetStringOptions = {}
  if (options?.inputFormat !== undefined) {
    nativeOptions.inputFormat = options.inputFormat
  }
  return native().setString(text, nativeOptions).catch(rethrowNativeError)
}

function hasString(): Promise<boolean> {
  return native().hasString().catch(rethrowNativeError)
}

function getImage(options: ClipboardGetImageOptions): Promise<ClipboardImage | null> {
  assertGetImageOptions(options)
  const nativeOptions: NativeImageOptions = { format: options.format }
  if (options.jpegQuality !== undefined) {
    nativeOptions.jpegQuality = options.jpegQuality
  }
  return native()
    .getImage(nativeOptions)
    .catch(rethrowNativeError)
    .then((result) =>
      result ? { data: result.data, size: { width: result.width, height: result.height } } : null
    )
}

function setImage(base64Image: string): Promise<void> {
  assertSetImage(base64Image)
  return native().setImage(base64Image).catch(rethrowNativeError)
}

function hasImage(): Promise<boolean> {
  return native().hasImage().catch(rethrowNativeError)
}

function getUrl(): Promise<string | null> {
  return native()
    .getUrl()
    .catch(rethrowNativeError)
    .then((url) => url ?? null)
}

function setUrl(url: string): Promise<void> {
  assertSetUrl(url)
  return native().setUrl(url).catch(rethrowNativeError)
}

function hasUrl(): Promise<boolean> {
  return native().hasUrl().catch(rethrowNativeError)
}

// one native listener slot fanned out to js listeners, mirroring the
// notifications entry: installed on the first add, cleared on the last
// remove.
const listeners = new Set<(event: ClipboardEvent) => void>()

function toContentType(value: string): ClipboardContentType | null {
  if (
    value === 'plain-text' ||
    value === 'image' ||
    value === 'url' ||
    value === 'html'
  ) {
    return value
  }
  return null
}

function addListener(
  listener: (event: ClipboardEvent) => void
): ClipboardSubscription {
  assertListener(listener)
  if (listeners.size === 0) {
    native().setClipboardListener((contentTypes) => {
      const event: ClipboardEvent = {
        contentTypes: contentTypes.flatMap((type) => {
          const mapped = toContentType(type)
          return mapped ? [mapped] : []
        }),
      }
      listeners.forEach((entry) => entry(event))
    })
  }
  listeners.add(listener)
  return {
    remove: () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        hybrid?.clearClipboardListener()
      }
    },
  }
}

export const Clipboard = Object.freeze({
  getString,
  setString,
  hasString,
  getImage,
  setImage,
  hasImage,
  getUrl,
  setUrl,
  hasUrl,
  addListener,
})
