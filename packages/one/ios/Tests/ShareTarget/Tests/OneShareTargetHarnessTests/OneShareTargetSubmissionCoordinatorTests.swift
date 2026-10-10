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

  /// The adapter stays held until after cancel completes. A coordinator
  /// that awaits the adapter rather than racing cancellation hangs here.
  func testCancelDoesNotWaitForUncooperativeDestinationsAndLeavesNoDraft() async throws {
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")], holdDestinations: true)
    let store = try makeStore()
    let coordinator = OneShareTargetSubmissionCoordinator(
      submissionId: "sub-1",
      configuration: makeConfiguration(),
      adapter: adapter,
      draftStore: store
    )

    _ = await coordinator.load(attachments: [], accompanyingText: "hello")
    // The callback event proves the first real manifest write completed.
    await adapter.destinationsEntered.wait()
    let cancelled = await coordinator.cancel()

    XCTAssertTrue(cancelled)
    let state = await coordinator.state
    XCTAssertEqual(state, .cancelled)

    let draft = try await store.load(submissionId: "sub-1")
    XCTAssertNil(draft, "cancel must not leave a draft recreated by a load that was still in flight")
    await adapter.destinationsRelease.open()
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
    let adapter = FakeAdapter(destinations: [.init(id: "d1", title: "Dest")], holdSend: true)
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
    await adapter.sendEntered.wait()
    let stateWhileSending = await coordinator.state
    XCTAssertEqual(stateWhileSending, .sending)

    let cancelled = await coordinator.cancel()
    XCTAssertFalse(cancelled, "a submission that may already be accepted must never present as cancellable")

    await adapter.sendRelease.open()
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

private actor FakeAdapter: OneShareTargetAdapter {
  let destinationsEntered = EventGate()
  let destinationsRelease = EventGate()
  let sendEntered = EventGate()
  let sendRelease = EventGate()
  private let destinationsResult: [OneShareDestination]
  private let destinationsError: Error?
  private let sendError: Error?
  private let holdDestinations: Bool
  private let holdSend: Bool
  init(destinations: [OneShareDestination] = [], destinationsError: Error? = nil,
       holdDestinations: Bool = false, sendError: Error? = nil, holdSend: Bool = false) {
    destinationsResult = destinations
    self.destinationsError = destinationsError
    self.sendError = sendError
    self.holdDestinations = holdDestinations
    self.holdSend = holdSend
  }
  init() {
    destinationsResult = []; destinationsError = nil; sendError = nil
    holdDestinations = false; holdSend = false
  }
  func destinations() async throws -> [OneShareDestination] {
    await destinationsEntered.open()
    if holdDestinations { await destinationsRelease.wait() }
    if let destinationsError { throw destinationsError }
    return destinationsResult
  }
  func send(submission: OneShareSubmission) async throws {
    await sendEntered.open()
    if holdSend { await sendRelease.wait() }
    if let sendError { throw sendError }
  }
}

actor EventGate {
  private var opened = false
  private var waiters: [CheckedContinuation<Void, Never>] = []
  func wait() async {
    if opened { return }
    await withCheckedContinuation { waiters.append($0) }
  }
  func open() {
    opened = true
    let pending = waiters; waiters = []
    pending.forEach { $0.resume() }
  }
}
