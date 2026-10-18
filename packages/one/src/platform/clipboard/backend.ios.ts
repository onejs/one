import { Data, NSData, NSString, NSUTF8StringEncoding, NotificationCenter, URL } from 'one/ios/Foundation'
import { UIImage, UIPasteboard } from 'one/ios/UIKit'
import { CGImage } from 'one/ios/CoreGraphics'
import type { SDKHandle } from 'one/ios-runtime'
import type { HybridObject } from 'react-native-nitro-modules'
import type { OneClipboard } from '../specs/OneClipboard.nitro'

const htmlType = 'public.html'
let listener: ((types: string[]) => void) | undefined
let observer: SDKHandle | undefined

function contentTypes(): string[] {
  const board = UIPasteboard.general
  const types: string[] = []
  if (board.hasStrings) types.push('plain-text')
  if (board.dataForPasteboardType(htmlType) !== null) types.push('html')
  if (board.hasImages) types.push('image')
  if (board.hasURLs) types.push('url')
  return types
}

function clearClipboardListener(): void {
  listener = undefined
  if (observer) {
    NotificationCenter.default.removeObserver(observer)
    observer = undefined
  }
}

const backend = {
  async getString(options) {
    const board = UIPasteboard.general
    if (options.preferredFormat === 'html') {
      const data = board.dataForPasteboardType(htmlType)
      const html = data ? NSString.initDataEncoding(data, NSUTF8StringEncoding) : null
      if (html) return html.description
    }
    return board.string ?? ''
  },
  async setString(text, options) {
    const board = UIPasteboard.general
    const data = options.inputFormat === 'html'
      ? NSString.initString(text).dataUsing(NSUTF8StringEncoding) : null
    if (data) {
      board.items = [{ [htmlType]: NSData.initData(data), 'public.utf8-plain-text': text }]
    } else {
      board.string = text
    }
    return true
  },
  async hasString() { return UIPasteboard.general.hasStrings },
  async getImage(options) {
    const image = UIPasteboard.general.image
    if (!image) return undefined
    const nativeCGImage = image.cgImage
    const cgImage = nativeCGImage ? new CGImage(nativeCGImage.$handle) : null
    const width = cgImage ? cgImage.width : Math.trunc(image.size.width)
    const height = cgImage ? cgImage.height : Math.trunc(image.size.height)
    const jpeg = options.format === 'jpeg'
    const data = jpeg ? image.jpegData(options.jpegQuality ?? 1) : image.pngData()
    if (!data) return undefined
    return {
      data: `data:image/${jpeg ? 'jpeg' : 'png'};base64,${NSData.initData(data).base64EncodedString()}`,
      width, height,
    }
  },
  async setImage(base64Image) {
    const comma = base64Image.indexOf(',')
    const payload = base64Image.startsWith('data:') && comma !== -1
      ? base64Image.slice(comma + 1) : base64Image
    const data = Data.initBase64EncodedOptions6221(payload, ['ignoreUnknownCharacters'])
    const image = data ? UIImage.initData(data) : null
    if (!image) {
      throw Object.assign(new Error('Clipboard.setImage: not decodable image data'), {
        code: 'E_CLIPBOARD_SET',
      })
    }
    UIPasteboard.general.image = image
  },
  async hasImage() { return UIPasteboard.general.hasImages },
  async getUrl() { return UIPasteboard.general.url ?? undefined },
  async setUrl(url) {
    const parsed = URL.initString(url)
    if (parsed) UIPasteboard.general.url = parsed
    else UIPasteboard.general.string = url
  },
  async hasUrl() { return UIPasteboard.general.hasURLs },
  setClipboardListener(next) {
    clearClipboardListener()
    listener = next
    observer = NotificationCenter.default.addObserver(
      UIPasteboard.changedNotification, null, null, () => listener?.(contentTypes())
    )
  },
  clearClipboardListener,
} satisfies Omit<OneClipboard, keyof HybridObject<{}>>

export function clipboardNative() {
  return backend
}
