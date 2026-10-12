import CryptoKit
import Foundation
import NitroModules
import UniformTypeIdentifiers

final class HybridOneFileSystem: HybridOneFileSystemSpec {
  private let queue = DispatchQueue(label: "one.file-system", qos: .utility)
  private let handlesLock = NSLock()
  private var handles: [Int: FileHandle] = [:]
  private var handleURLs: [Int: URL] = [:]
  private var nextHandle = 1

  private enum Problem: Error {
    case invalidURI
    case invalidBase64
    case invalidUTF8
    case invalidName
    case invalidMode
    case unknownHandle
    case protectedRoot
    case expectedFile
    case expectedDirectory
    case selfCopy
    case digestAlgorithm
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
        guard contents.utf8.count % 4 == 0,
          contents.range(
            of: #"\A[A-Za-z0-9+/]*={0,2}\z"#,
            options: .regularExpression) != nil,
          let decoded = Data(base64Encoded: contents)
        else { throw Problem.invalidBase64 }
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

  // MARK: - File, Directory, Paths, FileHandle

  func getBundleDirectory() throws -> String {
    try sync("getBundleDirectory") {
      Self.directoryURI(Bundle.main.bundleURL)
    }
  }

  func getDiskSpace() throws -> DiskSpace {
    try sync("getDiskSpace") {
      let attributes = try FileManager.default.attributesOfFileSystem(
        forPath: NSHomeDirectory())
      let available = (attributes[.systemFreeSize] as? NSNumber)?.doubleValue ?? 0
      let total = (attributes[.systemSize] as? NSNumber)?.doubleValue ?? 0
      return DiskSpace(available: available, total: total)
    }
  }

  func pathInfo(uri: String) throws -> PathStat {
    try sync("pathInfo") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      guard files.isReadableFile(atPath: url.path) else {
        return PathStat(exists: false, isDirectory: nil)
      }
      var directory: ObjCBool = false
      let exists = files.fileExists(atPath: url.path, isDirectory: &directory)
      return PathStat(exists: exists, isDirectory: exists ? directory.boolValue : nil)
    }
  }

  func readText(uri: String) throws -> String {
    try sync("readText") { try Self.readText(at: Self.fileURL(uri)) }
  }

  func readTextAsync(uri: String) throws -> Promise<String> {
    query("readText") { try Self.readText(at: Self.fileURL(uri)) }
  }

  func readData(uri: String) throws -> ArrayBuffer {
    try sync("readData") { try ArrayBuffer.copy(data: Data(contentsOf: Self.fileURL(uri))) }
  }

  func readDataAsync(uri: String) throws -> Promise<ArrayBuffer> {
    query("readData") { try ArrayBuffer.copy(data: Data(contentsOf: Self.fileURL(uri))) }
  }

  func readBase64(uri: String) throws -> String {
    try sync("readBase64") { try Data(contentsOf: Self.fileURL(uri)).base64EncodedString() }
  }

  func readBase64Async(uri: String) throws -> Promise<String> {
    query("readBase64") { try Data(contentsOf: Self.fileURL(uri)).base64EncodedString() }
  }

  func writeText(uri: String, contents: String, encoding: FileEncoding, append: Bool) throws {
    try sync("writeText") {
      try Self.write(data: Self.decoded(contents, encoding: encoding), to: Self.fileURL(uri), append: append)
    }
  }

  func writeTextAsync(
    uri: String, contents: String, encoding: FileEncoding, append: Bool
  ) throws -> Promise<Void> {
    perform("writeText") {
      try Self.write(data: Self.decoded(contents, encoding: encoding), to: Self.fileURL(uri), append: append)
    }
  }

  func writeData(uri: String, bytes: ArrayBuffer, append: Bool) throws {
    try sync("writeData") {
      try Self.write(data: bytes.toData(copyIfNeeded: true), to: Self.fileURL(uri), append: append)
    }
  }

  func writeDataAsync(uri: String, bytes: ArrayBuffer, append: Bool) throws -> Promise<Void> {
    let data = bytes.toData(copyIfNeeded: true)
    return perform("writeData") {
      try Self.write(data: data, to: Self.fileURL(uri), append: append)
    }
  }

  func fileDigest(uri: String, algorithm: String) throws -> Promise<String> {
    query("fileDigest") {
      let url = try Self.fileURL(uri)
      var directory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: url.path, isDirectory: &directory) else {
        throw CocoaError(.fileReadNoSuchFile)
      }
      guard !directory.boolValue else { throw Problem.expectedFile }
      guard let stream = InputStream(url: url) else { throw Problem.invalidURI }
      stream.open()
      defer { stream.close() }
      let chunk = 65536
      let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: chunk)
      defer { buffer.deallocate() }
      switch algorithm {
      case "MD5":
        var hash = Insecure.MD5()
        while stream.hasBytesAvailable {
          let read = stream.read(buffer, maxLength: chunk)
          if read < 0 { throw stream.streamError ?? Problem.invalidURI }
          if read == 0 { break }
          hash.update(data: Data(bytesNoCopy: buffer, count: read, deallocator: .none))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
      case "SHA-1":
        var hash = Insecure.SHA1()
        while stream.hasBytesAvailable {
          let read = stream.read(buffer, maxLength: chunk)
          if read < 0 { throw stream.streamError ?? Problem.invalidURI }
          if read == 0 { break }
          hash.update(data: Data(bytesNoCopy: buffer, count: read, deallocator: .none))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
      case "SHA-256":
        var hash = SHA256()
        while stream.hasBytesAvailable {
          let read = stream.read(buffer, maxLength: chunk)
          if read < 0 { throw stream.streamError ?? Problem.invalidURI }
          if read == 0 { break }
          hash.update(data: Data(bytesNoCopy: buffer, count: read, deallocator: .none))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
      case "SHA-384":
        var hash = SHA384()
        while stream.hasBytesAvailable {
          let read = stream.read(buffer, maxLength: chunk)
          if read < 0 { throw stream.streamError ?? Problem.invalidURI }
          if read == 0 { break }
          hash.update(data: Data(bytesNoCopy: buffer, count: read, deallocator: .none))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
      case "SHA-512":
        var hash = SHA512()
        while stream.hasBytesAvailable {
          let read = stream.read(buffer, maxLength: chunk)
          if read < 0 { throw stream.streamError ?? Problem.invalidURI }
          if read == 0 { break }
          hash.update(data: Data(bytesNoCopy: buffer, count: read, deallocator: .none))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
      default:
        throw Problem.digestAlgorithm
      }
    }
  }

  func createFileEntry(uri: String, intermediates: Bool, overwrite: Bool) throws {
    try sync("createFileEntry") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      if files.fileExists(atPath: url.path) {
        if !overwrite { throw Self.existsError() }
        try files.removeItem(at: Self.mutableURL(uri))
      }
      if intermediates {
        try files.createDirectory(
          at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
      }
      guard files.createFile(atPath: url.path, contents: nil) else {
        if !files.fileExists(atPath: url.deletingLastPathComponent().path) {
          throw CocoaError(.fileNoSuchFile)
        }
        throw CocoaError(.fileWriteUnknown)
      }
    }
  }

  func createDirectoryEntry(
    uri: String, intermediates: Bool, overwrite: Bool, idempotent: Bool
  ) throws {
    try sync("createDirectoryEntry") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      var directory: ObjCBool = false
      if files.fileExists(atPath: url.path, isDirectory: &directory) {
        if directory.boolValue {
          if idempotent { return }
          if !overwrite { throw Self.existsError() }
        } else if !overwrite {
          throw Self.existsError()
        }
        try files.removeItem(at: Self.mutableURL(uri))
      }
      try files.createDirectory(at: url, withIntermediateDirectories: intermediates)
    }
  }

  func createFileInDirectory(dirUri: String, name: String) throws -> String {
    try sync("createFileInDirectory") {
      let parent = try Self.fileURL(dirUri)
      var directory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: parent.path, isDirectory: &directory),
        directory.boolValue
      else { throw Problem.expectedDirectory }
      let child = parent.appendingPathComponent(try Self.entryName(name))
      guard FileManager.default.createFile(atPath: child.path, contents: nil) else {
        throw Self.existsError()
      }
      return child.absoluteString
    }
  }

  func createSubdirectory(dirUri: String, name: String) throws -> String {
    try sync("createSubdirectory") {
      let parent = try Self.fileURL(dirUri)
      var directory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: parent.path, isDirectory: &directory),
        directory.boolValue
      else { throw Problem.expectedDirectory }
      let child = parent.appendingPathComponent(try Self.entryName(name))
      try FileManager.default.createDirectory(at: child, withIntermediateDirectories: false)
      return child.absoluteString
    }
  }

  func deleteEntry(uri: String) throws {
    try sync("deleteEntry") {
      try FileManager.default.removeItem(at: Self.mutableURL(uri))
    }
  }

  func renameEntry(uri: String, newName: String) throws -> String {
    try sync("renameEntry") {
      let source = try Self.mutableURL(uri)
      let destination = source.deletingLastPathComponent().appendingPathComponent(
        try Self.entryName(newName))
      if FileManager.default.fileExists(atPath: destination.path) {
        throw Self.existsError()
      }
      try FileManager.default.moveItem(at: source, to: destination)
      return destination.absoluteString
    }
  }

  func copyEntry(fromUri: String, toUri: String, overwrite: Bool) throws {
    try sync("copyEntry") { try Self.relocate(copy: true, from: fromUri, to: toUri, overwrite: overwrite) }
  }

  func copyEntryAsync(fromUri: String, toUri: String, overwrite: Bool) throws -> Promise<Void> {
    perform("copyEntry") { try Self.relocate(copy: true, from: fromUri, to: toUri, overwrite: overwrite) }
  }

  func moveEntry(fromUri: String, toUri: String, overwrite: Bool) throws {
    try sync("moveEntry") { try Self.relocate(copy: false, from: fromUri, to: toUri, overwrite: overwrite) }
  }

  func moveEntryAsync(fromUri: String, toUri: String, overwrite: Bool) throws -> Promise<Void> {
    perform("moveEntry") { try Self.relocate(copy: false, from: fromUri, to: toUri, overwrite: overwrite) }
  }

  func listEntries(uri: String) throws -> [ListedEntry] {
    try sync("listEntries") {
      let url = try Self.fileURL(uri)
      var directory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: url.path, isDirectory: &directory),
        directory.boolValue
      else { throw Problem.expectedDirectory }
      let entries = try FileManager.default.contentsOfDirectory(
        at: url, includingPropertiesForKeys: [.isDirectoryKey])
      return try entries.map { entry in
        let isDirectory = try entry.resourceValues(forKeys: [.isDirectoryKey]).isDirectory ?? false
        return ListedEntry(name: entry.lastPathComponent, uri: entry.absoluteString, isDirectory: isDirectory)
      }.sorted { $0.name < $1.name }
    }
  }

  func fileDetails(uri: String) throws -> DetailedFileInfo {
    try sync("fileDetails") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      var directory: ObjCBool = false
      guard files.fileExists(atPath: url.path, isDirectory: &directory) else {
        return DetailedFileInfo(exists: false, size: 0, modificationTime: nil, creationTime: nil, mimeType: "")
      }
      guard !directory.boolValue else { throw Problem.expectedFile }
      let attributes = try files.attributesOfItem(atPath: url.path)
      return DetailedFileInfo(
        exists: true,
        size: (attributes[.size] as? NSNumber)?.doubleValue ?? 0,
        modificationTime: (attributes[.modificationDate] as? Date).map {
          $0.timeIntervalSince1970 * 1000
        },
        creationTime: (attributes[.creationDate] as? Date).map {
          $0.timeIntervalSince1970 * 1000
        },
        mimeType: Self.mimeType(for: url))
    }
  }

  func directoryDetails(uri: String) throws -> DetailedDirectoryInfo {
    try sync("directoryDetails") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      var directory: ObjCBool = false
      guard files.fileExists(atPath: url.path, isDirectory: &directory) else {
        return DetailedDirectoryInfo(
          exists: false, size: nil, modificationTime: nil, creationTime: nil, files: nil)
      }
      guard directory.boolValue else { throw Problem.expectedDirectory }
      let attributes = try files.attributesOfItem(atPath: url.path)
      let children = try files.contentsOfDirectory(atPath: url.path).sorted()
      var total = 0.0
      if let enumerator = files.enumerator(
        at: url, includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey])
      {
        for case let entry as URL in enumerator {
          let values = try entry.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
          if values.isRegularFile == true {
            total += Double(values.fileSize ?? 0)
          }
        }
      }
      return DetailedDirectoryInfo(
        exists: true,
        size: total,
        modificationTime: (attributes[.modificationDate] as? Date).map {
          $0.timeIntervalSince1970 * 1000
        },
        creationTime: (attributes[.creationDate] as? Date).map {
          $0.timeIntervalSince1970 * 1000
        },
        files: children)
    }
  }

  func openFile(uri: String, mode: String) throws -> Double {
    try sync("openFile") {
      let url = try Self.fileURL(uri)
      let files = FileManager.default
      var directory: ObjCBool = false
      if files.fileExists(atPath: url.path, isDirectory: &directory), directory.boolValue {
        throw Problem.expectedFile
      }
      let handle: FileHandle
      switch mode {
      case "r":
        handle = try FileHandle(forReadingFrom: url)
      case "rw":
        handle = try FileHandle(forUpdating: url)
      case "w":
        if !files.fileExists(atPath: url.path) {
          guard files.createFile(atPath: url.path, contents: nil) else {
            throw CocoaError(.fileNoSuchFile)
          }
        }
        handle = try FileHandle(forWritingTo: url)
      case "wa":
        if !files.fileExists(atPath: url.path) {
          guard files.createFile(atPath: url.path, contents: nil) else {
            throw CocoaError(.fileNoSuchFile)
          }
        }
        handle = try FileHandle(forWritingTo: url)
        try handle.seekToEnd()
      case "wt":
        if !files.fileExists(atPath: url.path) {
          guard files.createFile(atPath: url.path, contents: nil) else {
            throw CocoaError(.fileNoSuchFile)
          }
        }
        handle = try FileHandle(forWritingTo: url)
        try handle.truncate(atOffset: 0)
      default:
        throw Problem.invalidMode
      }
      return handlesLock.guarding {
        let id = nextHandle
        nextHandle += 1
        handles[id] = handle
        handleURLs[id] = url
        return Double(id)
      }
    }
  }

  func closeFile(handle: Double) throws {
    try sync("closeFile") {
      let id = Int(handle)
      let open: FileHandle? = handlesLock.guarding {
        handleURLs.removeValue(forKey: id)
        return handles.removeValue(forKey: id)
      }
      guard let open else { throw Problem.unknownHandle }
      try open.close()
    }
  }

  func readHandle(handle: Double, length: Double) throws -> ArrayBuffer {
    try sync("readHandle") {
      let open = try self.openHandle(Int(handle))
      guard length >= 0 else { throw Problem.invalidName }
      let data = try open.read(upToCount: Int(length)) ?? Data()
      return try ArrayBuffer.copy(data: data)
    }
  }

  func readHandleAsync(handle: Double, length: Double) throws -> Promise<ArrayBuffer> {
    query("readHandle") {
      let open = try self.openHandle(Int(handle))
      guard length >= 0 else { throw Problem.invalidName }
      let data = try open.read(upToCount: Int(length)) ?? Data()
      return try ArrayBuffer.copy(data: data)
    }
  }

  func writeHandle(handle: Double, bytes: ArrayBuffer) throws {
    try sync("writeHandle") {
      try Self.writeHandleData(try self.openHandle(Int(handle)), bytes.toData(copyIfNeeded: true))
    }
  }

  func writeHandleAsync(handle: Double, bytes: ArrayBuffer) throws -> Promise<Void> {
    let data = bytes.toData(copyIfNeeded: true)
    return perform("writeHandle") {
      try Self.writeHandleData(try self.openHandle(Int(handle)), data)
    }
  }

  func getHandleOffset(handle: Double) throws -> Double {
    try sync("getHandleOffset") { try Double(self.openHandle(Int(handle)).offset()) }
  }

  func setHandleOffset(handle: Double, offset: Double) throws {
    try sync("setHandleOffset") {
      guard offset >= 0 else { throw Problem.invalidName }
      try self.openHandle(Int(handle)).seek(toOffset: UInt64(offset))
    }
  }

  func getHandleSize(handle: Double) throws -> Double {
    try sync("getHandleSize") {
      let id = Int(handle)
      let url: URL? = handlesLock.guarding {
        guard handles[id] != nil else { return nil as URL? }
        return handleURLs[id]
      }
      guard let url else { throw Problem.unknownHandle }
      let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
      return (attributes[.size] as? NSNumber)?.doubleValue ?? 0
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

  private static func readText(at url: URL) throws -> String {
    let data = try Data(contentsOf: url)
    guard let text = String(data: data, encoding: .utf8) else {
      throw Problem.invalidUTF8
    }
    return text
  }

  private static func decoded(_ contents: String, encoding: FileEncoding) throws -> Data {
    switch encoding {
    case .utf8: return Data(contents.utf8)
    case .base64:
      guard contents.utf8.count % 4 == 0,
        contents.range(
          of: #"\A[A-Za-z0-9+/]*={0,2}\z"#,
          options: .regularExpression) != nil,
        let decoded = Data(base64Encoded: contents)
      else { throw Problem.invalidBase64 }
      return decoded
    }
  }

  private static func write(data: Data, to url: URL, append: Bool) throws {
    if append, FileManager.default.fileExists(atPath: url.path) {
      let handle = try FileHandle(forWritingTo: url)
      try handle.seekToEnd()
      try handle.write(contentsOf: data)
      try handle.close()
    } else {
      try data.write(to: url, options: .atomic)
    }
  }

  private static func entryName(_ name: String) throws -> String {
    guard !name.isEmpty, !name.contains("/"), name != ".", name != ".." else {
      throw Problem.invalidName
    }
    return name
  }

  private static func existsError() -> Error {
    CocoaError(.fileWriteFileExists)
  }

  private static func relocate(copy: Bool, from fromUri: String, to toUri: String, overwrite: Bool) throws {
    let source = try copy ? fileURL(fromUri) : mutableURL(fromUri)
    let destination = try fileURL(toUri)
    let files = FileManager.default
    if source.standardizedFileURL.path == destination.standardizedFileURL.path {
      throw Problem.selfCopy
    }
    var sourceDirectory: ObjCBool = false
    guard files.fileExists(atPath: source.path, isDirectory: &sourceDirectory) else {
      throw CocoaError(.fileNoSuchFile)
    }
    if sourceDirectory.boolValue
      && (destination.path + "/").hasPrefix(source.path.hasSuffix("/") ? source.path : source.path + "/")
    {
      throw Problem.selfCopy
    }
    if files.fileExists(atPath: destination.path) {
      if !overwrite { throw existsError() }
      _ = try mutableURL(toUri)
      try files.removeItem(at: destination)
    }
    if copy {
      try files.copyItem(at: source, to: destination)
    } else {
      try files.moveItem(at: source, to: destination)
    }
  }

  private static func mimeType(for url: URL) -> String {
    let ext = url.pathExtension.lowercased()
    guard !ext.isEmpty else { return "" }
    return UTType(filenameExtension: ext)?.preferredMIMEType ?? ""
  }

  private static func writeHandleData(_ handle: FileHandle, _ data: Data) throws {
    // an offset past the end appends instead of zero-filling the gap.
    let position = try handle.offset()
    let end = try handle.seekToEnd()
    if position < end {
      try handle.seek(toOffset: position)
    }
    try handle.write(contentsOf: data)
  }

  private func openHandle(_ id: Int) throws -> FileHandle {
    guard let open = handlesLock.guarding({ handles[id] }) else {
      throw Problem.unknownHandle
    }
    return open
  }

  private static func failure(_ verb: String, _ error: Error) -> RuntimeError {
    if let problem = error as? Problem {
      switch problem {
      case .invalidURI:
        return oneNativeError("E_FILE_URI", "FileSystem.\(verb): expected an absolute file URI")
      case .invalidBase64:
        return oneNativeError("E_FILE_ENCODING", "FileSystem.\(verb): invalid base64 contents")
      case .invalidUTF8:
        return oneNativeError("E_FILE_ENCODING", "FileSystem.\(verb): contents are not valid utf8")
      case .invalidName:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): invalid file name or byte range")
      case .invalidMode:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): invalid file mode")
      case .unknownHandle:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): unknown file handle")
      case .protectedRoot:
        return oneNativeError("E_FILE_PERMISSION", "FileSystem.\(verb): app root directories are protected")
      case .expectedFile:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): expected a file")
      case .expectedDirectory:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): expected a directory")
      case .selfCopy:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): a file cannot contain its copy")
      case .digestAlgorithm:
        return oneNativeError("E_FILE_FAILED", "FileSystem.\(verb): unknown digest algorithm")
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

  private func sync<T>(_ verb: String, _ work: () throws -> T) throws -> T {
    do {
      return try work()
    } catch {
      throw Self.failure(verb, error)
    }
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

private extension NSLock {
  // named to avoid the sdk's newer withLock, whose signature differs.
  func guarding<T>(_ work: () -> T) -> T {
    lock()
    defer { unlock() }
    return work()
  }
}
