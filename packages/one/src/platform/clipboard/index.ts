import type {
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

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. url
// methods are ios-only in expo, so on web they resolve the empty value;
// the change listener is a no-op on web, like expo.
function webClipboard(): Clipboard | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.clipboard ?? undefined
}

async function getString(options?: ClipboardGetStringOptions): Promise<string> {
  assertGetStringOptions(options, 'getString')
  const clipboard = webClipboard()
  if (!clipboard) return ''
  if (options?.preferredFormat === 'html' && typeof clipboard.read === 'function') {
    try {
      for (const item of await clipboard.read()) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html')
          return await blob.text()
        }
      }
    } catch {
      // fall through to plain text
    }
  }
  if (!clipboard.readText) return ''
  try {
    return await clipboard.readText()
  } catch {
    return ''
  }
}

function setString(text: string, options?: ClipboardSetStringOptions): Promise<boolean> {
  assertSetStringText(text)
  assertSetStringOptions(options, 'setString')
  return writeText(text, options?.inputFormat === 'html')
}

async function writeText(text: string, html: boolean): Promise<boolean> {
  const clipboard = webClipboard()
  if (!clipboard) return false
  if (html && typeof clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([text], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return true
    } catch {
      // fall through to plain text
    }
  }
  if (!clipboard.writeText) return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function hasString(): Promise<boolean> {
  return (await getString()).length > 0
}

function stripDataUriPrefix(base64Image: string): string {
  const comma = base64Image.indexOf(',')
  if (base64Image.startsWith('data:') && comma !== -1) {
    return base64Image.slice(comma + 1)
  }
  return base64Image
}

function sniffMimeType(bytes: Uint8Array): 'image/png' | 'image/jpeg' {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  return 'image/png'
}

function decodeBase64(base64Image: string): Uint8Array | null {
  try {
    const binary = atob(stripDataUriPrefix(base64Image))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

async function convertImage(
  blob: Blob,
  format: 'png' | 'jpeg',
  jpegQuality: number
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const width = bitmap.width
    const height = bitmap.height
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    if (
      (format === 'png' && blob.type === 'image/png') ||
      (format === 'jpeg' && blob.type === 'image/jpeg')
    ) {
      bitmap.close()
      const buffer = await blob.arrayBuffer()
      let binary = ''
      const bytes = new Uint8Array(buffer)
      for (let index = 0; index < bytes.length; index++) {
        binary += String.fromCharCode(bytes[index])
      }
      return { dataUrl: `data:${mime};base64,${btoa(binary)}`, width, height }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const dataUrl = canvas.toDataURL(mime, jpegQuality)
    return { dataUrl, width, height }
  } catch {
    return null
  }
}

async function getImage(options: ClipboardGetImageOptions): Promise<ClipboardImage | null> {
  assertGetImageOptions(options)
  const clipboard = webClipboard()
  if (!clipboard || typeof clipboard.read !== 'function') return null
  try {
    for (const item of await clipboard.read()) {
      const type = item.types.find((entry) => entry.startsWith('image/'))
      if (!type) continue
      const blob = await item.getType(type)
      const converted = await convertImage(blob, options.format, options.jpegQuality ?? 1)
      if (converted) {
        return { data: converted.dataUrl, size: { width: converted.width, height: converted.height } }
      }
    }
  } catch {
    return null
  }
  return null
}

async function setImage(base64Image: string): Promise<void> {
  assertSetImage(base64Image)
  const clipboard = webClipboard()
  if (!clipboard || typeof clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    return
  }
  const bytes = decodeBase64(base64Image)
  if (!bytes) return
  const mime = sniffMimeType(bytes)
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  try {
    await clipboard.write([
      new ClipboardItem({ [mime]: new Blob([copy.buffer as ArrayBuffer], { type: mime }) }),
    ])
  } catch {
    // denying the clipboard write is an ordinary outcome on web
  }
}

async function hasImage(): Promise<boolean> {
  const clipboard = webClipboard()
  if (!clipboard || typeof clipboard.read !== 'function') return false
  try {
    for (const item of await clipboard.read()) {
      if (item.types.some((entry) => entry.startsWith('image/'))) return true
    }
  } catch {
    return false
  }
  return false
}

async function getUrl(): Promise<string | null> {
  return null
}

async function setUrl(url: string): Promise<void> {
  assertSetUrl(url)
}

async function hasUrl(): Promise<boolean> {
  return false
}

const inert: ClipboardSubscription = { remove: () => {} }

function addListener(_listener: (event: ClipboardEvent) => void): ClipboardSubscription {
  assertListener(_listener)
  return inert
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
