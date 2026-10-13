import NitroModules
import UIKit

// clipboard matching expo-clipboard: strings with an optional html format,
// images as base64 data uris, urls, and a change listener, backed by the
// general pasteboard, read and written on the main actor. the listener is
// one native slot fanned out by js: installed on the first addListener,
// cleared on the last remove.
final class HybridOneClipboard: HybridOneClipboardSpec {
  private static let htmlType = "public.html"
  private var listener: (([String]) -> Void)?
  private var observer: NSObjectProtocol?

  func getString(options: ClipboardGetStringOptions) throws -> Promise<String> {
    let html = options.preferredFormat == "html"
    return Promise.async { @MainActor in
      if html, let data = UIPasteboard.general.data(forPasteboardType: Self.htmlType),
        let html = String(data: data, encoding: .utf8)
      {
        return html
      }
      return UIPasteboard.general.string ?? ""
    }
  }

  func setString(text: String, options: ClipboardSetStringOptions) throws -> Promise<Bool> {
    return Promise.async { @MainActor in
      // assigning .string replaces every pasteboard item, so html goes in
      // one item that carries both representations, like android's
      // newHtmlText.
      if options.inputFormat == "html", let data = text.data(using: .utf8) {
        UIPasteboard.general.items = [[Self.htmlType: data, "public.utf8-plain-text": text]]
      } else {
        UIPasteboard.general.string = text
      }
      return true
    }
  }

  func hasString() throws -> Promise<Bool> {
    return Promise.async { @MainActor in UIPasteboard.general.hasStrings }
  }

  func getImage(options: ClipboardGetImageOptions) throws -> Promise<ClipboardImageResult?> {
    let format = options.format
    let quality = options.jpegQuality ?? 1
    return Promise.async { @MainActor in
      guard let image = UIPasteboard.general.image else { return nil }
      let width = Double(image.cgImage?.width ?? Int(image.size.width))
      let height = Double(image.cgImage?.height ?? Int(image.size.height))
      let encoded: (data: Data, prefix: String)?
      if format == "jpeg" {
        encoded = image.jpegData(compressionQuality: quality).map { ($0, "data:image/jpeg;base64,") }
      } else {
        encoded = image.pngData().map { ($0, "data:image/png;base64,") }
      }
      guard let encoded else { return nil }
      return ClipboardImageResult(
        data: encoded.prefix + encoded.data.base64EncodedString(),
        width: width, height: height)
    }
  }

  func setImage(base64Image: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      guard let image = Self.image(from: base64Image) else {
        promise.reject(
          withError: oneNativeError("E_CLIPBOARD_SET", "Clipboard.setImage: not decodable image data"))
        return
      }
      UIPasteboard.general.image = image
      promise.resolve()
    }
    return promise
  }

  func hasImage() throws -> Promise<Bool> {
    return Promise.async { @MainActor in UIPasteboard.general.hasImages }
  }

  func getUrl() throws -> Promise<String?> {
    return Promise.async { @MainActor in UIPasteboard.general.url?.absoluteString }
  }

  func setUrl(url: String) throws -> Promise<Void> {
    return Promise.async { @MainActor in
      if let parsed = URL(string: url) {
        UIPasteboard.general.url = parsed
      } else {
        UIPasteboard.general.string = url
      }
    }
  }

  func hasUrl() throws -> Promise<Bool> {
    return Promise.async { @MainActor in UIPasteboard.general.hasURLs }
  }

  func setClipboardListener(listener: @escaping ([String]) -> Void) throws {
    clearObserver()
    self.listener = listener
    observer = NotificationCenter.default.addObserver(
      forName: UIPasteboard.changedNotification, object: nil, queue: .main
    ) { [weak self] _ in
      guard let self, let listener = self.listener else { return }
      listener(Self.contentTypes())
    }
  }

  func clearClipboardListener() throws {
    listener = nil
    clearObserver()
  }

  private func clearObserver() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
  }

  private static func contentTypes() -> [String] {
    let pasteboard = UIPasteboard.general
    var types: [String] = []
    if pasteboard.hasStrings { types.append("plain-text") }
    if pasteboard.data(forPasteboardType: htmlType) != nil { types.append("html") }
    if pasteboard.hasImages { types.append("image") }
    if pasteboard.hasURLs { types.append("url") }
    return types
  }

  private static func image(from base64Image: String) -> UIImage? {
    let payload: String
    if base64Image.hasPrefix("data:"), let comma = base64Image.firstIndex(of: ",") {
      payload = String(base64Image[base64Image.index(after: comma)...])
    } else {
      payload = base64Image
    }
    guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters) else {
      return nil
    }
    return UIImage(data: data)
  }
}
