import XCTest
@testable import OneShareTargetCore

final class OneShareTargetDraftStoreTests: XCTestCase {
  private var scratchDirectory: URL!

  override func setUpWithError() throws {
    scratchDirectory = FileManager.default.temporaryDirectory
      .appendingPathComponent("OneShareTargetDraftStoreTests-\(UUID().uuidString)", isDirectory: true)
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: scratchDirectory)
  }

  func testSaveLoadRoundTrip() async throws {
    let store = try OneShareTargetDraftStore(directory: scratchDirectory)
    let draft = OneShareTargetDraft(
      id: "submission-1",
      destinationId: "destination-a",
      text: "hello",
      items: [.text("hello"), .url(URL(string: "https://example.com")!)],
      // ISO 8601 round-tripping drops sub-second precision, so pin to a
      // whole second rather than asserting equality against `Date()`.
      createdAt: Date(timeIntervalSince1970: 1_700_000_000)
    )
    try await store.save(draft)

    let loaded = try await store.load(submissionId: "submission-1")
    XCTAssertEqual(loaded, draft)
  }

  func testLoadMissingDraftReturnsNil() async throws {
    let store = try OneShareTargetDraftStore(directory: scratchDirectory)
    let loaded = try await store.load(submissionId: "does-not-exist")
    XCTAssertNil(loaded)
  }

  func testDiscardRemovesOnlyThatSubmission() async throws {
    let store = try OneShareTargetDraftStore(directory: scratchDirectory)
    let fixedDate = Date(timeIntervalSince1970: 1_700_000_000)
    let keep = OneShareTargetDraft(id: "keep", destinationId: nil, text: "keep me", items: [], createdAt: fixedDate)
    let drop = OneShareTargetDraft(id: "drop", destinationId: nil, text: "drop me", items: [], createdAt: fixedDate)
    try await store.save(keep)
    try await store.save(drop)

    try await store.discard(submissionId: "drop")

    let remaining = await store.allSubmissionIds()
    XCTAssertEqual(remaining, ["keep"])
    let loadedKeep = try await store.load(submissionId: "keep")
    XCTAssertEqual(loadedKeep, keep)
  }

  func testItemsDirectoryIsScopedPerSubmissionAndSurvivesUntilDiscard() async throws {
    let store = try OneShareTargetDraftStore(directory: scratchDirectory)
    let directory = try await store.itemsDirectory(forSubmissionId: "submission-with-files")
    let fileURL = directory.appendingPathComponent("attachment.bin")
    try Data([0x01, 0x02, 0x03]).write(to: fileURL)

    XCTAssertTrue(FileManager.default.fileExists(atPath: fileURL.path))

    try await store.discard(submissionId: "submission-with-files")

    XCTAssertFalse(FileManager.default.fileExists(atPath: fileURL.path), "discard must remove the draft's copied files too")
  }

  func testMissingAppGroupContainerThrowsATypedError() {
    XCTAssertThrowsError(try OneShareTargetDraftStore(appGroupIdentifier: "group.one.nonexistent.test-only")) { error in
      guard case OneShareTargetError.missingAppGroupContainer = error else {
        return XCTFail("expected missingAppGroupContainer, got \(error)")
      }
    }
  }
}
