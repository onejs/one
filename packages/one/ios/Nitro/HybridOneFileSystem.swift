import Foundation
import NitroModules

final class HybridOneFileSystem: HybridOneFileSystemSpec {
  private let queue = DispatchQueue(label: "one.file-system", qos: .utility)

  private enum Problem: Error {
    case invalidURI
    case invalidBase64
    case protectedRoot
  }

  func getDirectories() throws -> FileDirectories {
    let files = FileManager.default
    return FileDirectories(
      documents: Self.directoryURI(files.urls(for: .documentDirectory, in: .userDomainMask)[0]),
      cache: Self.directoryURI(files.urls(for: .cachesDirectory, in: .userDomainMask)[0]),
      applicationSupport: Self.directoryURI(files.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]),
      temporary: Self.directoryURI(URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)))
  }

  func getInfo(uri: String) throws -> Promise<FileInfo> {
    query("getInfo") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      var directory: ObjCBool = false
      let exists = files.fileExists(atPath: url.path, isDirectory: &directory)
      guard exists else {
        return FileInfo(uri: url.absoluteString, exists: false, isDirectory: false, size: nil, modifiedAt: nil)
      }
      let attributes = try files.attributesOfItem(atPath: url.path)
      let size = (attributes[.size] as? NSNumber)?.doubleValue
      let modifiedAt = (attributes[.modificationDate] as? Date)?.timeIntervalSince1970
      return FileInfo(
        uri: url.absoluteString, exists: true, isDirectory: directory.boolValue,
        size: size, modifiedAt: modifiedAt.map { $0 * 1000 })
    }
  }

  func readDirectory(uri: String) throws -> Promise<[FileEntry]> {
    query("readDirectory") {
      let url = try Self.fileURL(uri)
      let entries = try FileManager.default.contentsOfDirectory(
        at: url, includingPropertiesForKeys: [.isDirectoryKey])
      return try entries.map { entry in
        let isDirectory = try entry.resourceValues(forKeys: [.isDirectoryKey]).isDirectory ?? false
        return FileEntry(name: entry.lastPathComponent, uri: entry.absoluteString, isDirectory: isDirectory)
      }.sorted { $0.name < $1.name }
    }
  }

  func makeDirectory(uri: String, intermediates: Bool) throws -> Promise<Void> {
    perform("makeDirectory") {
      try FileManager.default.createDirectory(
        at: Self.fileURL(uri), withIntermediateDirectories: intermediates)
    }
  }

  func writeFile(uri: String, contents: String, encoding: FileEncoding) throws -> Promise<Void> {
    perform("writeFile") {
      let data: Data
      switch encoding {
      case .utf8: data = Data(contents.utf8)
      case .base64:
        guard let decoded = Data(base64Encoded: contents) else { throw Problem.invalidBase64 }
        data = decoded
      }
      try data.write(to: Self.fileURL(uri), options: .atomic)
    }
  }

  func copy(fromUri: String, toUri: String) throws -> Promise<Void> {
    perform("copy") {
      try FileManager.default.copyItem(at: Self.fileURL(fromUri), to: Self.fileURL(toUri))
    }
  }

  func move(fromUri: String, toUri: String) throws -> Promise<Void> {
    perform("move") {
      try FileManager.default.moveItem(at: Self.mutableURL(fromUri), to: Self.fileURL(toUri))
    }
  }

  func remove(uri: String) throws -> Promise<Void> {
    perform("delete") {
      try FileManager.default.removeItem(at: Self.mutableURL(uri))
    }
  }

  private static func fileURL(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL, url.path.hasPrefix("/"),
      url.host == nil || url.host == "" || url.host == "localhost",
      url.query == nil, url.fragment == nil
    else {
      throw Problem.invalidURI
    }
    return url.standardizedFileURL
  }

  private static func mutableURL(_ uri: String) throws -> URL {
    let url = try fileURL(uri)
    let files = FileManager.default
    let protected = [
      NSHomeDirectory(), NSTemporaryDirectory(),
      files.urls(for: .documentDirectory, in: .userDomainMask)[0].path,
      files.urls(for: .libraryDirectory, in: .userDomainMask)[0].path,
      files.urls(for: .cachesDirectory, in: .userDomainMask)[0].path,
      files.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].path,
    ]
    if protected.contains(where: {
      URL(fileURLWithPath: $0, isDirectory: true).standardizedFileURL.path == url.path
    }) {
      throw Problem.protectedRoot
    }
    return url
  }

  private static func directoryURI(_ url: URL) -> String {
    let uri = url.absoluteString
    return uri.hasSuffix("/") ? uri : uri + "/"
  }

  private static func failure(_ verb: String, _ error: Error) -> RuntimeError {
    if let problem = error as? Problem {
      switch problem {
      case .invalidURI:
        return oneNativeError("E_FILE_URI", "FileSystem.\(verb): expected an absolute file URI")
      case .invalidBase64:
        return oneNativeError("E_FILE_ENCODING", "FileSystem.\(verb): invalid base64 contents")
      case .protectedRoot:
        return oneNativeError("E_FILE_PERMISSION", "FileSystem.\(verb): app root directories are protected")
      }
    }
    let nativeError = error as NSError
    let code: String
    if nativeError.domain == NSCocoaErrorDomain {
      switch nativeError.code {
      case CocoaError.fileNoSuchFile.rawValue, CocoaError.fileReadNoSuchFile.rawValue:
        code = "E_FILE_NOT_FOUND"
      case CocoaError.fileWriteFileExists.rawValue:
        code = "E_FILE_EXISTS"
      case CocoaError.fileReadNoPermission.rawValue, CocoaError.fileWriteNoPermission.rawValue:
        code = "E_FILE_PERMISSION"
      case CocoaError.fileWriteVolumeReadOnly.rawValue:
        code = "E_FILE_PERMISSION"
      default:
        code = "E_FILE_FAILED"
      }
    } else {
      code = "E_FILE_FAILED"
    }
    return oneNativeError(
      code, "FileSystem.\(verb): \(nativeError.domain) \(nativeError.code): \(error.localizedDescription)")
  }

  private func perform(_ verb: String, _ work: @escaping () throws -> Void) -> Promise<Void> {
    let promise = Promise<Void>()
    queue.async {
      do {
        try work()
        promise.resolve()
      } catch {
        promise.reject(withError: Self.failure(verb, error))
      }
    }
    return promise
  }

  private func query<T>(_ verb: String, _ work: @escaping () throws -> T) -> Promise<T> {
    let promise = Promise<T>()
    queue.async {
      do {
        promise.resolve(withResult: try work())
      } catch {
        promise.reject(withError: Self.failure(verb, error))
      }
    }
    return promise
  }
}
