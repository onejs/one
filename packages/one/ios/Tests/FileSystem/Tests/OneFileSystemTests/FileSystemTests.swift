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
}
