import XCTest
@testable import OneShareTargetCore

/// Exercises intake against real `NSItemProvider` instances and real files
/// on disk -- no mocks of the copy path itself. Runs on the host toolchain
/// (no UIKit needed); see ../../README.md for why the compose controller is
/// validated separately.
final class OneShareTargetIntakeTests: XCTestCase {
  /// Where intake writes its copies. Assertions about "nothing left behind"
  /// look only here, never in `sourceDirectory`.
  private var scratchDirectory: URL!
  /// Where fixture source files (the ones `NSItemProvider` points at) live;
  /// kept separate from `scratchDirectory` so leftover source fixtures are
  /// never mistaken for a copy-path bug.
  private var sourceDirectory: URL!

  override func setUpWithError() throws {
    let root = FileManager.default.temporaryDirectory
      .appendingPathComponent("OneShareTargetIntakeTests-\(UUID().uuidString)", isDirectory: true)
    scratchDirectory = root.appendingPathComponent("destination", isDirectory: true)
    sourceDirectory = root.appendingPathComponent("source", isDirectory: true)
    try FileManager.default.createDirectory(at: scratchDirectory, withIntermediateDirectories: true)
    try FileManager.default.createDirectory(at: sourceDirectory, withIntermediateDirectories: true)
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: scratchDirectory.deletingLastPathComponent())
  }

  private func makeConfiguration(
    maxItems: Int = 5,
    maxItemBytes: Int = 1024 * 1024,
    maxTotalBytes: Int = 4 * 1024 * 1024
  ) -> OneShareTargetConfiguration {
    OneShareTargetConfiguration(
      appGroupIdentifier: "ignored-in-tests",
      acceptedFileTypeIdentifiers: ["public.data"],
      maxItems: maxItems,
      maxItemBytes: maxItemBytes,
      maxTotalBytes: maxTotalBytes
    )
  }

  private func makeFileProvider(byteCount: Int, name: String = "payload.bin") throws -> NSItemProvider {
    let sourceURL = sourceDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent(name)
    try FileManager.default.createDirectory(at: sourceURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    let data = Data(repeating: 0x41, count: byteCount)
    try data.write(to: sourceURL)
    return NSItemProvider(contentsOf: sourceURL) ?? NSItemProvider()
  }

  // MARK: - Accompanying text

  func testPreservesAccompanyingText() async throws {
    let intake = OneShareTargetIntake(configuration: makeConfiguration())
    let items = try await intake.intake(
      attachments: [],
      accompanyingText: "caption from the system compose field",
      destinationDirectory: scratchDirectory,
      isCancelled: { false }
    )
    XCTAssertEqual(items, [.text("caption from the system compose field")])
  }

  // MARK: - Representation priority

  /// Safari's own page-share attachment (and many others) registers both a
  /// URL and a plain-text title for the same item; the link must win so it
  /// isn't silently lost in favor of its title text.
  func testURLRepresentationWinsOverEquivalentPlainText() async throws {
    let provider = NSItemProvider()
    provider.registerObject(URL(string: "https://example.com/page")! as NSURL, visibility: .all)
    provider.registerObject("Example Page" as NSString, visibility: .all)

    let intake = OneShareTargetIntake(configuration: makeConfiguration())
    let items = try await intake.intake(
      attachments: [provider],
      accompanyingText: nil,
      destinationDirectory: scratchDirectory,
      isCancelled: { false }
    )
    XCTAssertEqual(items, [.url(URL(string: "https://example.com/page")!)])
  }

  // MARK: - Text/URL byte budgets

  func testRejectsOversizeTextAttachment() async throws {
    let longText = String(repeating: "a", count: 2048)
    let provider = NSItemProvider(object: longText as NSString)
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItemBytes: 1024))

    do {
      _ = try await intake.intake(
        attachments: [provider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected itemTooLarge")
    } catch OneShareTargetError.itemTooLarge(let name, let limit) {
      XCTAssertEqual(name, "text")
      XCTAssertEqual(limit, 1024)
    }
  }

  func testRejectsOversizeURLAttachment() async throws {
    let url = URL(string: "https://example.com/" + String(repeating: "a", count: 2048))!
    let provider = NSItemProvider(object: url as NSURL)
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItemBytes: 64))

    do {
      _ = try await intake.intake(
        attachments: [provider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected itemTooLarge")
    } catch OneShareTargetError.itemTooLarge(let name, _) {
      XCTAssertEqual(name, "url")
    }
  }

  func testTextAndURLItemsCountTowardTotalBudget() async throws {
    let text = String(repeating: "a", count: 1000)
    let textProvider = NSItemProvider(object: text as NSString)
    let fileProvider = try makeFileProvider(byteCount: 500)
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItemBytes: 10_000, maxTotalBytes: 1200))

    do {
      _ = try await intake.intake(
        attachments: [textProvider, fileProvider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected a total-budget failure: text (1000 bytes) + file (500 bytes) exceeds a 1200-byte total")
    } catch OneShareTargetError.itemTooLarge {
      // the per-item budget clamps to the remaining total budget
    } catch OneShareTargetError.totalTooLarge {
      // also acceptable
    }
  }

  // MARK: - File copy, bounded and chunked

  func testCopiesFileWithinBudget() async throws {
    let provider = try makeFileProvider(byteCount: 10 * 1024)
    let intake = OneShareTargetIntake(configuration: makeConfiguration())
    let items = try await intake.intake(
      attachments: [provider],
      accompanyingText: nil,
      destinationDirectory: scratchDirectory,
      isCancelled: { false }
    )
    guard case .file(let file)? = items.first else {
      return XCTFail("expected a single copied file item, got \(items)")
    }
    XCTAssertEqual(file.byteCount, 10 * 1024)
    XCTAssertTrue(FileManager.default.fileExists(atPath: file.url.path))
    let copiedData = try Data(contentsOf: file.url)
    XCTAssertEqual(copiedData.count, 10 * 1024)
  }

  func testRejectsOversizeItemAndLeavesNoPartialFile() async throws {
    let provider = try makeFileProvider(byteCount: 2 * 1024 * 1024)
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItemBytes: 1024 * 1024))

    do {
      _ = try await intake.intake(
        attachments: [provider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected itemTooLarge")
    } catch OneShareTargetError.itemTooLarge {
      // expected
    }

    let leftovers = try FileManager.default.contentsOfDirectory(atPath: scratchDirectory.path)
    XCTAssertEqual(leftovers, [], "a rejected oversize copy must not leave a partial destination file")
  }

  func testRejectsWhenTotalBudgetExceededAcrossAttachments() async throws {
    let first = try makeFileProvider(byteCount: 3 * 1024 * 1024, name: "a.bin")
    let second = try makeFileProvider(byteCount: 3 * 1024 * 1024, name: "b.bin")
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItemBytes: 10 * 1024 * 1024, maxTotalBytes: 4 * 1024 * 1024))

    do {
      _ = try await intake.intake(
        attachments: [first, second],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected a total-budget failure")
    } catch OneShareTargetError.itemTooLarge {
      // the per-item budget is clamped to the remaining total budget, so the
      // second copy fails as an oversize item -- which is the desired
      // behavior: stop before exceeding the total, no silent truncation.
    } catch OneShareTargetError.totalTooLarge {
      // also acceptable depending on which attachment order runs first
    }
  }

  // MARK: - Count limit

  func testRejectsTooManyAttachments() async throws {
    let intake = OneShareTargetIntake(configuration: makeConfiguration(maxItems: 1))
    let providers = [try makeFileProvider(byteCount: 10, name: "one.bin"), try makeFileProvider(byteCount: 10, name: "two.bin")]

    do {
      _ = try await intake.intake(
        attachments: providers,
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected tooManyItems")
    } catch OneShareTargetError.tooManyItems(let limit) {
      XCTAssertEqual(limit, 1)
    }
  }

  // MARK: - Cancellation

  func testCancellationStopsBeforeCopying() async throws {
    let provider = try makeFileProvider(byteCount: 10 * 1024)
    let intake = OneShareTargetIntake(configuration: makeConfiguration())

    do {
      _ = try await intake.intake(
        attachments: [provider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { true }
      )
      XCTFail("expected intakeCancelled")
    } catch OneShareTargetError.intakeCancelled {
      // expected
    }

    let leftovers = try FileManager.default.contentsOfDirectory(atPath: scratchDirectory.path)
    XCTAssertEqual(leftovers, [], "cancellation must not leave any copied file behind")
  }

  // MARK: - Unsupported attachment

  func testUnsupportedAttachmentThrowsRatherThanDropping() async throws {
    let provider = NSItemProvider(item: NSNumber(value: 1), typeIdentifier: "com.example.unsupported-type")
    let intake = OneShareTargetIntake(configuration: makeConfiguration())

    do {
      _ = try await intake.intake(
        attachments: [provider],
        accompanyingText: nil,
        destinationDirectory: scratchDirectory,
        isCancelled: { false }
      )
      XCTFail("expected unsupportedAttachment")
    } catch OneShareTargetError.unsupportedAttachment {
      // expected: no silent drop
    }
  }
}
