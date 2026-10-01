import XCTest
@testable import OneShareTargetCore

/// Exercises the compose state machine's concurrency-sensitive sequencing
/// against a real `OneShareTargetDraftStore` on real files and a scriptable
/// fake adapter -- no mocked actor isolation, no simulated scheduling.
final class OneShareTargetSubmissionCoordinatorTests: XCTestCase {
  private var scratchDirectory: URL!

  override func setUpWithError() throws {
    scratchDirectory = FileManager.default.temporaryDirectory
      .appendingPathComponent("OneShareTargetSubmissionCoordinatorTests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: scratchDirectory, withIntermediateDirectories: true)
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: scratchDirectory)
  }

  private func makeStore() throws -> OneShareTargetDraftStore {
    try OneShareTargetDraftStore(directory: scratchDirectory)
  }

  private func makeConfiguration() -> OneShareTargetConfiguration {
    OneShareTargetConfiguration(appGroupIdentifier: "ignored-in-tests", maxItemBytes: 1024, maxTotalBytes: 4096)
  }

  // MARK: - Cancel awaits the in-flight load before discarding

  /// A `destinations()` call that takes a moment to resolve, so `cancel()`
  /// has a real window in which the load is still writing to disk when
  /// cancellation is requested.
  func testCancelDuringLoadAwaitsLoadBeforeDiscardingAndLeavesNoDraft() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")], destinationsDelayNanoseconds: 50_000_000)
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-1",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    _ = await coordinator.load(attachments: [], accompanyingText: "hello")
    // Give the load a moment to start (past the first persist) before cancelling,
    // so this actually exercises the race rather than cancelling before anything started.
    try await Task.sleep(nanoseconds: 5_000_000)
    let cancelled = await coordinator.cancel()

    XCTAssertTrue(cancelled)
    let state = await coordinator.state
    XCTAssertEqual(state, .cancelled)

    // The regression this proves: without cancel() awaiting the in-flight
    // load, the load's post-destinations persist can land after discard and
    // recreate the "cancelled" draft. With the fix, no draft remains.
    let draft = try await store.load(submissionId: "sub-1")
    XCTAssertNil(draft, "cancel must not leave a draft recreated by a load that was still in flight")
  }

  // MARK: - destinations() failure still persists already-copied items

  func testDestinationsFailureStillPersistsCopiedItems() async throws {
    let adapter = FakeAdapter(destinationsError: SampleError.boom)
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-2",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "caption").value
    let state = await coordinator.state
    XCTAssertEqual(state, .failed)

    let draft = try await store.load(submissionId: "sub-2")
    XCTAssertEqual(draft?.text, "caption", "a destinations() failure must not drop the already-copied/persisted items")
  }

  // MARK: - Successful delivery is never raced by a queued persist

  func testSuccessfulSendDiscardsDraftAndBlocksAnyLaterPersist() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")])
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-3",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "hi").value
    await coordinator.selectDestination("d1")
    let result = await coordinator.send()

    guard case .success = result else { return XCTFail("expected send to succeed") }
    let state = await coordinator.state
    XCTAssertEqual(state, .delivered)
    var draft = try await store.load(submissionId: "sub-3")
    XCTAssertNil(draft, "a delivered submission must not leave a draft behind")

    // A persist attempted after delivery (e.g. a stray edit callback that
    // raced the teardown) must be refused, not silently recreate the draft.
    await coordinator.updateText("too late")
    draft = try await store.load(submissionId: "sub-3")
    XCTAssertNil(draft, "no action may recreate a draft once the state is terminal")
  }

  // MARK: - A submission that may already be accepted cannot be cancelled

  func testCancelIsRefusedWhileSendIsInFlight() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")], sendDelayNanoseconds: 50_000_000)
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-4",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "hi").value
    await coordinator.selectDestination("d1")

    let sendTask = Task { await coordinator.send() }
    try await Task.sleep(nanoseconds: 10_000_000)
    let stateWhileSending = await coordinator.state
    XCTAssertEqual(stateWhileSending, .sending)

    let cancelled = await coordinator.cancel()
    XCTAssertFalse(cancelled, "a submission that may already be accepted must never present as cancellable")

    let result = await sendTask.value
    guard case .success = result else { return XCTFail("expected send to still succeed") }
    let finalState = await coordinator.state
    XCTAssertEqual(finalState, .delivered)
  }

  // MARK: - A failed send is recoverable, not terminal

  func testFailedSendReturnsToReadyForRetry() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")], sendError: SampleError.boom)
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-5",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "hi").value
    await coordinator.selectDestination("d1")
    let result = await coordinator.send()

    guard case .failure = result else { return XCTFail("expected send to fail") }
    let state = await coordinator.state
    XCTAssertEqual(state, .ready, "a failed send must retain the draft/UI for retry, not strand the user")
    let draft = try await store.load(submissionId: "sub-5")
    XCTAssertNotNil(draft, "a failed send must not have discarded the draft")
  }

  // MARK: - The terminal guard itself, deterministically

  /// `testCancelDuringLoadAwaitsLoadBeforeDiscardingAndLeavesNoDraft` above
  /// exercises the real scheduling path, but winning that race deterministically
  /// isn't possible from a test. This calls the same guarded write directly,
  /// which is exactly what a persist landing late from that race would hit.
  func testPersistIsRefusedAfterCancelEvenIfAttemptedDirectly() async throws {
    let adapter = FakeAdapter()
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-7",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "x").value
    _ = await coordinator.cancel()
    try? await coordinator.persistNow()

    let draft = try await store.load(submissionId: "sub-7")
    XCTAssertNil(draft, "a persist attempted after cancellation must never recreate the discarded draft")
  }

  func testPersistIsRefusedAfterSuccessfulSendEvenIfAttemptedDirectly() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")])
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-8",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: "x").value
    await coordinator.selectDestination("d1")
    let result = await coordinator.send()
    guard case .success = result else { return XCTFail("expected send to succeed") }
    try? await coordinator.persistNow()

    let draft = try await store.load(submissionId: "sub-8")
    XCTAssertNil(draft, "a persist attempted after a successful delivery must never recreate the discarded draft")
  }

  // MARK: - Byte budget

  func testIsSendableFalseWhenTextExceedsByteBudget() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")])
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-6",
      configuration: OneShareTargetConfiguration(appGroupIdentifier: "ignored", maxItemBytes: 8, maxTotalBytes: 64),
      adapter: adapter,
      draftStore: store
    )

    await coordinator.load(attachments: [], accompanyingText: nil).value
    await coordinator.selectDestination("d1")
    var sendable = await coordinator.isSendable
    XCTAssertTrue(sendable)

    await coordinator.updateText("way too long for the budget")
    sendable = await coordinator.isSendable
    XCTAssertFalse(sendable, "text exceeding the configured byte budget must not be sendable")
  }
}

// MARK: - Fixtures

private enum SampleError: Error, Equatable {
  case boom
}

private final class FakeAdapter: OneShareTargetAdapter, @unchecked Sendable {
  private let destinationsResult: [OneShareDestination]
  private let destinationsError: Error?
  private let destinationsDelayNanoseconds: UInt64
  private let sendError: Error?
  private let sendDelayNanoseconds: UInt64

  init(
    destinations: [OneShareDestination] = [],
    destinationsError: Error? = nil,
    destinationsDelayNanoseconds: UInt64 = 0,
    sendError: Error? = nil,
    sendDelayNanoseconds: UInt64 = 0
  ) {
    self.destinationsResult = destinations
    self.destinationsError = destinationsError
    self.destinationsDelayNanoseconds = destinationsDelayNanoseconds
    self.sendError = sendError
    self.sendDelayNanoseconds = sendDelayNanoseconds
  }

  required init() {
    self.destinationsResult = []
    self.destinationsError = nil
    self.destinationsDelayNanoseconds = 0
    self.sendError = nil
    self.sendDelayNanoseconds = 0
  }

  func destinations() async throws -> [OneShareDestination] {
    if destinationsDelayNanoseconds > 0 {
      try? await Task.sleep(nanoseconds: destinationsDelayNanoseconds)
    }
    if let destinationsError { throw destinationsError }
    return destinationsResult
  }

  func send(submission: OneShareSubmission) async throws {
    if sendDelayNanoseconds > 0 {
      try? await Task.sleep(nanoseconds: sendDelayNanoseconds)
    }
    if let sendError { throw sendError }
  }
}
