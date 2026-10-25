import Foundation
import WebKit

// serves one build's one-dom directory at one-dom://app/<selection>/... with no
// network fallback. the origin stays fixed so storage survives updates; the
// selection in the path keeps a same-view reload from reusing an older build's bytes.
final class OneDOMResourceHandler: NSObject, WKURLSchemeHandler {
  static let scheme = "one-dom"
  static let host = "app"

  let selection: String
  private let base: URL
  // tasks webkit has not stopped and we have not answered. teardown does not
  // call stop, so close() empties this too; replying outside it crashes webkit.
  private var live = Set<ObjectIdentifier>()
  private var closed = false
  private static let queue = DispatchQueue(label: "dev.onejs.dom.resources", qos: .userInitiated)
  private static var manifests: [String: [String: String]] = [:]

  init(selection: String, base: URL) {
    self.selection = selection
    self.base = base.resolvingSymlinksInPath().standardizedFileURL
  }

  // the built page for an entry, from that build's manifest.
  static func page(entryId: String, base: URL) -> [String]? {
    let key = base.resolvingSymlinksInPath().standardizedFileURL.path
    if manifests[key] == nil {
      guard let data = try? Data(contentsOf: base.appendingPathComponent("manifest.json")),
        let manifest = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
        (manifest["protocolVersion"] as? NSNumber)?.intValue == 1,
        manifest["buildId"] is String,
        let entries = manifest["entries"] as? [String: String]
      else { return nil }
      manifests[key] = entries
    }
    guard let path = manifests[key]?[entryId] else { return nil }
    let segments = path.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    guard segments.allSatisfy(valid) else { return nil }
    return segments
  }

  func url(for segments: [String]) -> URL {
    var components = URLComponents()
    components.scheme = Self.scheme
    components.host = Self.host
    let allowed = CharacterSet.urlPathAllowed.subtracting(CharacterSet(charactersIn: "/;"))
    components.percentEncodedPath = "/" + ([selection] + segments)
      .map { $0.addingPercentEncoding(withAllowedCharacters: allowed)! }
      .joined(separator: "/")
    return components.url!
  }

  func close() {
    closed = true
    live.removeAll()
  }

  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard !closed, let url = task.request.url else { return }
    let id = ObjectIdentifier(task)
    live.insert(id)
    guard let file = resolve(url) else {
      return reply(task, id: id, url: url, status: 404, type: "text/plain; charset=utf-8", body: Data())
    }
    let html = file.pathExtension == "html"
    Self.queue.async { [weak self] in
      let body = try? Data(contentsOf: file)
      DispatchQueue.main.async {
        guard let self else { return }
        if let body {
          self.reply(task, id: id, url: url, status: 200, type: Self.mime(file.pathExtension), body: body,
            cache: html ? "no-cache" : "public, max-age=31536000, immutable")
        } else {
          self.reply(task, id: id, url: url, status: 404, type: "text/plain; charset=utf-8", body: Data())
        }
      }
    }
  }

  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
    live.remove(ObjectIdentifier(task))
  }

  private func reply(
    _ task: WKURLSchemeTask, id: ObjectIdentifier, url: URL, status: Int, type: String, body: Data,
    cache: String = "no-store"
  ) {
    guard live.remove(id) != nil else { return }
    let headers = ["Content-Type": type, "Content-Length": String(body.count), "Cache-Control": cache]
    task.didReceive(HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!)
    task.didReceive(body)
    task.didFinish()
  }

  // decode each segment on its own so an encoded slash or dot segment never
  // becomes a separator, then require the real path to stay inside the build.
  private func resolve(_ url: URL) -> URL? {
    guard url.scheme == Self.scheme, url.host == Self.host else { return nil }
    let encoded = url.path(percentEncoded: true).split(separator: "/", omittingEmptySubsequences: false).dropFirst()
    guard encoded.first.map(String.init) == selection else { return nil }
    var file = base
    for segment in encoded.dropFirst() {
      guard let decoded = segment.removingPercentEncoding, Self.valid(decoded) else { return nil }
      file.appendPathComponent(decoded)
    }
    let real = file.resolvingSymlinksInPath().standardizedFileURL
    var isDirectory: ObjCBool = false
    guard real.path.hasPrefix(base.path + "/"),
      FileManager.default.fileExists(atPath: real.path, isDirectory: &isDirectory), !isDirectory.boolValue
    else { return nil }
    return real
  }

  private static func valid(_ segment: String) -> Bool {
    !segment.isEmpty && segment != "." && segment != ".." && !segment.contains("/")
      && !segment.contains("\\") && !segment.contains("\0")
  }

  // module scripts are rejected under any type but javascript.
  static func mime(_ ext: String) -> String {
    switch ext.lowercased() {
    case "html": return "text/html; charset=utf-8"
    case "js", "mjs": return "text/javascript; charset=utf-8"
    case "css": return "text/css; charset=utf-8"
    case "json", "map": return "application/json"
    case "txt": return "text/plain; charset=utf-8"
    case "svg": return "image/svg+xml"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "gif": return "image/gif"
    case "webp": return "image/webp"
    case "avif": return "image/avif"
    case "ico": return "image/x-icon"
    case "woff": return "font/woff"
    case "woff2": return "font/woff2"
    case "ttf": return "font/ttf"
    case "otf": return "font/otf"
    case "wasm": return "application/wasm"
    case "mp4": return "video/mp4"
    case "webm": return "video/webm"
    case "mp3": return "audio/mpeg"
    case "wav": return "audio/wav"
    default: return "application/octet-stream"
    }
  }
}
