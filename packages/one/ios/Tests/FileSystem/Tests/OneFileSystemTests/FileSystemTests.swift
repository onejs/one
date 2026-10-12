import Foundation
import XCTest
import NitroModules
@testable import OneFileSystemCore

final class FileSystemTests: XCTestCase {
  private var directory: URL!
  private var fs: HybridOneFileSystem!

  override func setUpWithError() throws {
    directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
    fs = HybridOneFileSystem()
  }

  override func tearDownWithError() throws {
    try FileManager.default.removeItem(at: directory)
  }

  func testPaddedBase64AndEmptyWrites() throws {
    let target = directory.appendingPathComponent("data.bin")
    for (encoded, bytes): (String, [UInt8]) in [("", []), ("AA==", [0]), ("AAE=", [0, 1]), ("AAEC", [0, 1, 2]), ("AAECAw==", [0, 1, 2, 3])] {
      try fs.writeFile(uri: target.absoluteString, contents: encoded, encoding: .base64).wait()
      XCTAssertEqual(try Data(contentsOf: target), Data(bytes))
    }
  }

  func testMalformedBase64RejectsBeforeCreatingOrReplacingFile() throws {
    let existing = directory.appendingPathComponent("existing.bin")
    let missing = directory.appendingPathComponent("missing.bin")
    let original = Data("preserved".utf8)
    for encoded in ["====", "AA=A", "AAAA=", "A===", "AAA", "AA==AAAA", "AA\n==", "AA==\n", "!?", "__8="] {
      try original.write(to: existing)
      if FileManager.default.fileExists(atPath: missing.path) { try FileManager.default.removeItem(at: missing) }
      for target in [existing, missing] {
        XCTAssertThrowsError(try fs.writeFile(uri: target.absoluteString, contents: encoded, encoding: .base64).wait(), encoded) { error in
          guard case RuntimeError.error(let message) = error else { return XCTFail("unexpected error: \(error)") }
          XCTAssertEqual(message, "E_FILE_ENCODING: FileSystem.writeFile: invalid base64 contents")
        }
      }
      XCTAssertEqual(try Data(contentsOf: existing), original, encoded)
      XCTAssertFalse(FileManager.default.fileExists(atPath: missing.path), encoded)
    }
  }

  func testFileLifecycleStillWorks() throws {
    let source = directory.appendingPathComponent("note.txt")
    let copy = directory.appendingPathComponent("copy.txt")
    let moved = directory.appendingPathComponent("moved.txt")
    try fs.writeFile(uri: source.absoluteString, contents: "héllo 👋", encoding: .utf8).wait()
    XCTAssertEqual(try fs.getInfo(uri: source.absoluteString).wait().size, 11)
    try fs.copy(fromUri: source.absoluteString, toUri: copy.absoluteString).wait()
    try fs.move(fromUri: copy.absoluteString, toUri: moved.absoluteString).wait()
    XCTAssertEqual(try Data(contentsOf: moved), Data("héllo 👋".utf8))
    XCTAssertThrowsError(try fs.copy(fromUri: source.absoluteString, toUri: moved.absoluteString).wait())
    try fs.remove(uri: moved.absoluteString).wait()
    XCTAssertFalse(try fs.getInfo(uri: moved.absoluteString).wait().exists)
  }

  func testSyncReadsWritesAndAppend() throws {
    let target = directory.appendingPathComponent("sync.txt")
    try fs.writeText(uri: target.absoluteString, contents: "héllo", encoding: .utf8, append: false)
    XCTAssertEqual(try fs.readText(uri: target.absoluteString), "héllo")
    XCTAssertEqual(try fs.readTextAsync(uri: target.absoluteString).wait(), "héllo")
    try fs.writeText(uri: target.absoluteString, contents: " 👋", encoding: .utf8, append: true)
    XCTAssertEqual(try fs.readText(uri: target.absoluteString), "héllo 👋")
    XCTAssertEqual(
      try fs.readData(uri: target.absoluteString).toData(copyIfNeeded: true),
      Data("héllo 👋".utf8))
    XCTAssertEqual(
      try fs.readDataAsync(uri: target.absoluteString).wait().toData(copyIfNeeded: true),
      Data("héllo 👋".utf8))
    XCTAssertEqual(
      try fs.readBase64(uri: target.absoluteString), Data("héllo 👋".utf8).base64EncodedString())
    try fs.writeText(uri: target.absoluteString, contents: "QUJD", encoding: .base64, append: false)
    XCTAssertEqual(try fs.readText(uri: target.absoluteString), "ABC")
    try fs.writeData(
      uri: target.absoluteString, bytes: ArrayBuffer(data: Data([1, 2, 3])), append: false)
    XCTAssertEqual(try fs.readData(uri: target.absoluteString).toData(copyIfNeeded: true), Data([1, 2, 3]))
    try fs.writeDataAsync(
      uri: target.absoluteString, bytes: ArrayBuffer(data: Data([4])), append: true
    ).wait()
    XCTAssertEqual(
      try fs.readData(uri: target.absoluteString).toData(copyIfNeeded: true), Data([1, 2, 3, 4]))
  }

  func testInvalidReadsAndWritesThrowCodedErrors() throws {
    let binary = directory.appendingPathComponent("binary.dat")
    try Data([0xff, 0xfe]).write(to: binary)
    XCTAssertThrowsError(try fs.readText(uri: binary.absoluteString)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_ENCODING"))
    }
    XCTAssertThrowsError(
      try fs.writeText(uri: binary.absoluteString, contents: "!?", encoding: .base64, append: false)
    ) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_ENCODING"))
    }
    XCTAssertEqual(try Data(contentsOf: binary), Data([0xff, 0xfe]))
    XCTAssertThrowsError(try fs.readText(uri: directory.appendingPathComponent("missing.txt").absoluteString)) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_NOT_FOUND"))
    }
  }

  func testFileHandlesAcrossModes() throws {
    let target = directory.appendingPathComponent("handle.bin")
    try Data([10, 20, 30, 40]).write(to: target)
    let reader = try fs.openFile(uri: target.absoluteString, mode: "r")
    XCTAssertEqual(try fs.getHandleOffset(handle: reader), 0)
    XCTAssertEqual(try fs.getHandleSize(handle: reader), 4)
    XCTAssertEqual(
      try fs.readHandle(handle: reader, length: 2).toData(copyIfNeeded: true), Data([10, 20]))
    XCTAssertEqual(try fs.getHandleOffset(handle: reader), 2)
    try fs.setHandleOffset(handle: reader, offset: 3)
    XCTAssertEqual(
      try fs.readHandleAsync(handle: reader, length: 5).wait().toData(copyIfNeeded: true), Data([40]))
    // reads past the end return empty data.
    XCTAssertEqual(
      try fs.readHandle(handle: reader, length: 5).toData(copyIfNeeded: true), Data())
    try fs.closeFile(handle: reader)
    XCTAssertThrowsError(try fs.readHandle(handle: reader, length: 1)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }

    let writer = try fs.openFile(uri: target.absoluteString, mode: "rw")
    try fs.setHandleOffset(handle: writer, offset: 1)
    try fs.writeHandle(handle: writer, bytes: ArrayBuffer(data: Data([7, 8])))
    XCTAssertEqual(try Data(contentsOf: target), Data([10, 7, 8, 40]))
    try fs.writeHandleAsync(handle: writer, bytes: ArrayBuffer(data: Data([9]))).wait()
    XCTAssertEqual(try Data(contentsOf: target), Data([10, 7, 8, 9]))
    // an offset past the end appends instead of zero-filling.
    try fs.setHandleOffset(handle: writer, offset: 99)
    try fs.writeHandle(handle: writer, bytes: ArrayBuffer(data: Data([1])))
    XCTAssertEqual(try Data(contentsOf: target), Data([10, 7, 8, 9, 1]))
    try fs.closeFile(handle: writer)

    let appender = try fs.openFile(uri: target.absoluteString, mode: "wa")
    XCTAssertEqual(try fs.getHandleOffset(handle: appender), 5)
    try fs.closeFile(handle: appender)
    let truncator = try fs.openFile(uri: target.absoluteString, mode: "wt")
    XCTAssertEqual(try fs.getHandleSize(handle: truncator), 0)
    try fs.closeFile(handle: truncator)

    let fresh = directory.appendingPathComponent("fresh.bin")
    let created = try fs.openFile(uri: fresh.absoluteString, mode: "w")
    try fs.closeFile(handle: created)
    XCTAssertTrue(FileManager.default.fileExists(atPath: fresh.path))
    XCTAssertThrowsError(try fs.openFile(uri: directory.appendingPathComponent("nope.bin").absoluteString, mode: "r")) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_NOT_FOUND"))
    }
    XCTAssertThrowsError(try fs.openFile(uri: target.absoluteString, mode: "xx")) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    XCTAssertThrowsError(try fs.closeFile(handle: 999999)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    XCTAssertThrowsError(try fs.openFile(uri: directory.absoluteString, mode: "r")) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
  }

  func testDetailsListAndDigest() throws {
    let nested = directory.appendingPathComponent("nested", isDirectory: true)
    try FileManager.default.createDirectory(at: nested, withIntermediateDirectories: false)
    let note = nested.appendingPathComponent("note.txt")
    try Data("abc".utf8).write(to: note)
    let details = try fs.fileDetails(uri: note.absoluteString)
    XCTAssertTrue(details.exists)
    XCTAssertEqual(details.size, 3)
    XCTAssertEqual(details.mimeType, "text/plain")
    XCTAssertNotNil(details.modificationTime)
    XCTAssertNotNil(details.creationTime)
    let missing = try fs.fileDetails(uri: nested.appendingPathComponent("missing.txt").absoluteString)
    XCTAssertFalse(missing.exists)
    XCTAssertEqual(missing.size, 0)
    XCTAssertThrowsError(try fs.fileDetails(uri: nested.absoluteString)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    let dirDetails = try fs.directoryDetails(uri: nested.absoluteString)
    XCTAssertTrue(dirDetails.exists)
    XCTAssertEqual(dirDetails.size, 3)
    XCTAssertEqual(dirDetails.files, ["note.txt"])
    XCTAssertThrowsError(try fs.directoryDetails(uri: note.absoluteString)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    let listed = try fs.listEntries(uri: nested.absoluteString)
    XCTAssertEqual(listed.map(\.name), ["note.txt"])
    XCTAssertFalse(listed[0].isDirectory)
    XCTAssertThrowsError(try fs.listEntries(uri: note.absoluteString)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    XCTAssertEqual(try fs.fileDigest(uri: note.absoluteString, algorithm: "MD5").wait(), "900150983cd24fb0d6963f7d28e17f72")
    XCTAssertEqual(
      try fs.fileDigest(uri: note.absoluteString, algorithm: "SHA-256").wait(),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    XCTAssertThrowsError(try fs.fileDigest(uri: note.absoluteString, algorithm: "CRC32").wait()) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    XCTAssertThrowsError(
      try fs.fileDigest(uri: nested.appendingPathComponent("missing.txt").absoluteString, algorithm: "SHA-256").wait()
    ) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_NOT_FOUND"))
    }
    XCTAssertThrowsError(try fs.fileDigest(uri: nested.absoluteString, algorithm: "SHA-256").wait()) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
  }

  func testCreateRenameAndRelocate() throws {
    let deep = directory.appendingPathComponent("a/b/c.txt")
    XCTAssertThrowsError(try fs.createFileEntry(uri: deep.absoluteString, intermediates: false, overwrite: false)) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_NOT_FOUND"))
    }
    try fs.createFileEntry(uri: deep.absoluteString, intermediates: true, overwrite: false)
    XCTAssertThrowsError(try fs.createFileEntry(uri: deep.absoluteString, intermediates: false, overwrite: false)) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_EXISTS"))
    }
    try fs.createFileEntry(uri: deep.absoluteString, intermediates: false, overwrite: true)
    let dir = directory.appendingPathComponent("made", isDirectory: true)
    try fs.createDirectoryEntry(
      uri: dir.absoluteString, intermediates: false, overwrite: false, idempotent: false)
    try fs.createDirectoryEntry(
      uri: dir.absoluteString, intermediates: false, overwrite: false, idempotent: true)
    XCTAssertThrowsError(
      try fs.createDirectoryEntry(
        uri: dir.absoluteString, intermediates: false, overwrite: false, idempotent: false)
    ) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_EXISTS"))
    }
    let child = try fs.createFileInDirectory(dirUri: dir.absoluteString, name: "child.txt")
    XCTAssertTrue(child.hasSuffix("/child.txt"))
    let sub = try fs.createSubdirectory(dirUri: dir.absoluteString, name: "sub")
    XCTAssertTrue(sub.hasSuffix("/sub"))
    XCTAssertThrowsError(try fs.createSubdirectory(dirUri: dir.absoluteString, name: "a/b")) {
      error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    let renamed = try fs.renameEntry(uri: child, newName: "renamed.txt")
    XCTAssertTrue(renamed.hasSuffix("/renamed.txt"))
    try fs.copyEntry(fromUri: renamed, toUri: deep.absoluteString, overwrite: true)
    try fs.moveEntryAsync(fromUri: renamed, toUri: directory.appendingPathComponent("gone.txt").absoluteString, overwrite: false).wait()
    XCTAssertThrowsError(
      try fs.copyEntry(fromUri: renamed, toUri: renamed, overwrite: true)
    ) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    XCTAssertThrowsError(
      try fs.copyEntry(fromUri: dir.absoluteString, toUri: sub, overwrite: true)
    ) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_FAILED"))
    }
    try fs.deleteEntry(uri: dir.absoluteString)
    XCTAssertThrowsError(try fs.deleteEntry(uri: dir.absoluteString)) { error in
      XCTAssertTrue("\(error)".contains("E_FILE_NOT_FOUND"))
    }
  }

  func testPathsAndInfo() throws {
    XCTAssertFalse(try fs.getBundleDirectory().isEmpty)
    let space = try fs.getDiskSpace()
    XCTAssertGreaterThan(space.total, 0)
    XCTAssertGreaterThanOrEqual(space.available, 0)
    let target = directory.appendingPathComponent("info.txt")
    try Data("x".utf8).write(to: target)
    let file = try fs.pathInfo(uri: target.absoluteString)
    XCTAssertTrue(file.exists)
    XCTAssertEqual(file.isDirectory, false)
    let dir = try fs.pathInfo(uri: directory.absoluteString)
    XCTAssertTrue(dir.exists)
    XCTAssertEqual(dir.isDirectory, true)
    let missing = try fs.pathInfo(uri: directory.appendingPathComponent("missing").absoluteString)
    XCTAssertFalse(missing.exists)
    XCTAssertNil(missing.isDirectory)
  }
}
