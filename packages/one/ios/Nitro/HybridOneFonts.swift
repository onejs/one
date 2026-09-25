import CommonCrypto
import CoreText
import NitroModules
import UIKit

// runtime font loading for One.UI.Fonts. one path: make the uri a local
// file, register it for the process, then check the name. only the observed
// schemes ship: file:// is used as is, http(s):// is downloaded to
// Caches/one-fonts/<sha256 of url>.<ext>.
final class HybridOneFonts: HybridOneFontsSpec {
  private static func fontIsLoaded(_ name: String) -> Bool {
    if UIFont(name: name, size: 12) != nil {
      return true
    }
    return !UIFont.fontNames(forFamilyName: name).isEmpty
  }

  func isLoaded(name: String) throws -> Bool {
    return Self.fontIsLoaded(name)
  }

  private static func sha256Hex(_ string: String) -> String {
    let data = Data(string.utf8)
    var digest = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &digest) }
    return digest.map { String(format: "%02x", $0) }.joined()
  }

  // throws the rejection itself, so the caller only forwards it.
  private static func cachedFile(for url: URL, name: String) throws -> URL {
    let ext = url.pathExtension.isEmpty ? "ttf" : url.pathExtension
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let directory = caches.appendingPathComponent("one-fonts", isDirectory: true)
    let file = directory.appendingPathComponent("\(sha256Hex(url.absoluteString)).\(ext)")
    if FileManager.default.fileExists(atPath: file.path) {
      return file
    }
    let failed = oneNativeError("E_FONTS_DOWNLOAD", "Fonts.load: \"\(name)\" could not be downloaded")
    guard let data = try? Data(contentsOf: url) else { throw failed }
    if data.isEmpty {
      throw oneNativeError("E_FONTS_DOWNLOAD", "Fonts.load: \"\(name)\" downloaded zero bytes")
    }
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try data.write(to: file, options: .atomic)
    } catch {
      throw failed
    }
    return file
  }

  func load(name: String, uri: String) throws -> Promise<Void> {
    if Self.fontIsLoaded(name) {
      return Promise.resolved()
    }
    guard let url = URL(string: uri) else {
      return Promise.rejected(
        withError: oneNativeError("E_FONTS_URI", "Fonts.load: \"\(name)\" is not a usable uri"))
    }
    let scheme = url.scheme?.lowercased() ?? ""
    let isFile = scheme == "file"
    let isRemote = scheme == "http" || scheme == "https"
    if !isFile && !isRemote {
      return Promise.rejected(
        withError: oneNativeError(
          "E_FONTS_URI", "Fonts.load: \"\(name)\" uses an unsupported uri scheme \"\(scheme)\""))
    }
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .utility).async {
      do {
        try Self.register(name: name, url: url, isRemote: isRemote)
        promise.resolve()
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  private static func register(name: String, url: URL, isRemote: Bool) throws {
    var fileURL = url
    if isRemote {
      fileURL = try cachedFile(for: url, name: name)
    } else if !FileManager.default.fileExists(atPath: fileURL.path) {
      throw oneNativeError("E_FONTS_URI", "Fonts.load: \"\(name)\" points at a missing file")
    }
    var registerError: Unmanaged<CFError>?
    if !CTFontManagerRegisterFontsForURL(fileURL as CFURL, .process, &registerError),
      let error = registerError?.takeRetainedValue()
    {
      let code = CFErrorGetCode(error)
      let benign =
        code == CTFontManagerError.alreadyRegistered.rawValue
        || code == CTFontManagerError.duplicatedName.rawValue
      if !benign {
        throw oneNativeError("E_FONTS_REGISTER", "Fonts.load: \"\(name)\" could not be registered")
      }
    }
    if !fontIsLoaded(name) {
      let descriptors =
        CTFontManagerCreateFontDescriptorsFromURL(fileURL as CFURL) as? [CTFontDescriptor] ?? []
      let realNames = descriptors.compactMap {
        CTFontDescriptorCopyAttribute($0, kCTFontNameAttribute) as? String
      }.filter { !$0.isEmpty }
      let provided = realNames.isEmpty ? "" : ", file provides \(realNames.joined(separator: ", "))"
      throw oneNativeError(
        "E_FONTS_NAME",
        "Fonts.load: \"\(name)\" is not usable after registration (expected the PostScript name\(provided))"
      )
    }
  }
}
