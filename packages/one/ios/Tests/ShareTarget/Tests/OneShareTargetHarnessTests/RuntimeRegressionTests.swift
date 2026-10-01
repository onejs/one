import XCTest
import UniformTypeIdentifiers
@testable import OneShareTargetCore

final class RuntimeRegressionTests: XCTestCase {
  func testCaptionExactlyOnceAndEdited() async throws {
    let store = try OneShareTargetDraftStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
    let adapter = RecordingAdapter()
    let coordinator = OneShareTargetSubmissionCoordinator(configuration: .init(appGroupIdentifier: "test"), adapter: adapter, draftStore: store)
    await coordinator.load(attachments: [], accompanyingText: "caption").value
    await coordinator.updateText("edited")
    _ = await coordinator.send()
    let sent = await adapter.sent
    XCTAssertEqual(sent?.text, "edited")
    XCTAssertEqual(sent?.items, [])
  }

  func testPlainTextIsEditableInitialContent() async throws {
    let store = try OneShareTargetDraftStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
    let coordinator = OneShareTargetSubmissionCoordinator(configuration: .init(appGroupIdentifier: "test"), adapter: RecordingAdapter(), draftStore: store)
    let provider = NSItemProvider(item: "incoming" as NSString, typeIdentifier: UTType.plainText.identifier)
    await coordinator.load(attachments: [provider], accompanyingText: nil).value
    let text = await coordinator.text
    XCTAssertEqual(text, "incoming")
  }

  func testSendEnforcesResidualAggregateBudget() async throws {
    let store = try OneShareTargetDraftStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
    let adapter = RecordingAdapter()
    let coordinator = OneShareTargetSubmissionCoordinator(configuration: .init(appGroupIdentifier: "test", maxItemBytes: 32, maxTotalBytes: 24), adapter: adapter, draftStore: store)
    let provider = NSItemProvider(item: URL(string: "https://example.com")! as NSURL, typeIdentifier: UTType.url.identifier)
    await coordinator.load(attachments: [provider], accompanyingText: nil).value
    await coordinator.updateText("12345678")
    let sendable = await coordinator.isSendable
    XCTAssertFalse(sendable)
    let result = await coordinator.send()
    guard case .failure = result else { return XCTFail("over-budget send reached adapter") }
    let sent = await adapter.sent
    XCTAssertNil(sent)
    _ = await coordinator.cancel()
  }

  func testCaptionIntakeEnforcesBytesAndRejectedType() async throws {
    let intake = OneShareTargetIntake(configuration: .init(appGroupIdentifier: "test", maxItemBytes: 4, maxTotalBytes: 4))
    do {
      _ = try await intake.intake(attachments: [], accompanyingText: "oversized", destinationDirectory: FileManager.default.temporaryDirectory, isCancelled: { false })
      XCTFail("unbounded caption accepted")
    } catch { }
    let rejectsText = OneShareTargetIntake(configuration: .init(appGroupIdentifier: "test", acceptsText: false))
    do {
      _ = try await rejectsText.intake(attachments: [], accompanyingText: "caption", destinationDirectory: FileManager.default.temporaryDirectory, isCancelled: { false })
      XCTFail("mismatched caption silently dropped")
    } catch { }
  }
}

actor RecordingAdapter: OneShareTargetAdapter {
  var sent: OneShareSubmission?
  init() {}
  func destinations() async throws -> [OneShareDestination] { [.init(id: "d", title: "Destination")] }
  func send(submission: OneShareSubmission) async throws { sent = submission }
}

extension RuntimeRegressionTests {
  func testSendWaitsForQueuedSaveBeforeAcceptanceAndDeletion() async throws {
    let gate = SaveGate()
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = try OneShareTargetDraftStore(directory: root, beforeSave: { await gate.before($0) })
    let adapter = RecordingAdapter()
    let coordinator = OneShareTargetSubmissionCoordinator(submissionId: "ordered", configuration: .init(appGroupIdentifier: "test"), adapter: adapter, draftStore: store)
    await coordinator.load(attachments: [], accompanyingText: "original").value
    await gate.arm()
    await coordinator.updateText("queued")
    await gate.entered.wait()
    let send = Task { await coordinator.send() }
    await coordinator.waitForState(.sending)
    let notAccepted = await adapter.sent
    XCTAssertNil(notAccepted, "adapter must not run while an older save is suspended")
    await coordinator.updateText("blocked edit")
    let cancelled = await coordinator.cancel()
    XCTAssertFalse(cancelled)
    await gate.release.open()
    guard case .success = await send.value else { return XCTFail("send failed") }
    let sent = await adapter.sent
    XCTAssertEqual(sent?.text, "queued")
    let draft = try await store.load(submissionId: "ordered")
    XCTAssertNil(draft)
    let ids = await store.allSubmissionIds()
    XCTAssertTrue(ids.isEmpty)
  }

  func testCancelWaitsForQueuedRealWriteThenDeletesDirectory() async throws {
    let gate = SaveGate()
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = try OneShareTargetDraftStore(directory: root, beforeSave: { await gate.before($0) })
    let coordinator = OneShareTargetSubmissionCoordinator(submissionId: "cancel-write", configuration: .init(appGroupIdentifier: "test"), adapter: RecordingAdapter(), draftStore: store)
    await coordinator.load(attachments: [], accompanyingText: "original").value
    await gate.arm()
    await coordinator.updateText("queued")
    await gate.entered.wait()
    let cancel = Task { await coordinator.cancel() }
    await coordinator.waitForState(.cancelling)
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("cancel-write/draft.json").path))
    await gate.release.open()
    let cancelled = await cancel.value
    XCTAssertTrue(cancelled)
    XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("cancel-write").path))
  }

  func testEditsDuringProviderLoadSurvive() async throws {
    let providerGate = ProviderGate()
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = try OneShareTargetDraftStore(directory: root)
    let coordinator = OneShareTargetSubmissionCoordinator(submissionId: "provider", configuration: .init(appGroupIdentifier: "test"), adapter: RecordingAdapter(), draftStore: store)
    let provider = NSItemProvider()
    provider.registerDataRepresentation(forTypeIdentifier: UTType.plainText.identifier, visibility: .all) { completion in
      providerGate.begin(completion)
      return nil
    }
    let load = await coordinator.load(attachments: [provider], accompanyingText: nil)
    await providerGate.entered.wait()
    await coordinator.updateText("user edit during load")
    providerGate.complete()
    await load.value
    let text = await coordinator.text
    XCTAssertEqual(text, "user edit during load")
    let draft = try await store.load(submissionId: "provider")
    XCTAssertEqual(draft?.text, text)
    _ = await coordinator.cancel()
  }

  func testCancelCopyAwaitsProviderCompletionThenRemovesDisk() async throws {
    let entered = EventGate()
    let release = EventGate()
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let source = root.appendingPathComponent("source.bin")
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    try Data(repeating: 65, count: 512_000).write(to: source)
    let store = try OneShareTargetDraftStore(directory: root.appendingPathComponent("drafts"))
    let coordinator = OneShareTargetSubmissionCoordinator(submissionId: "cancel-provider", configuration: .init(appGroupIdentifier: "test", acceptedFileTypeIdentifiers: [UTType.data.identifier]), adapter: RecordingAdapter(), draftStore: store)
    let provider = NSItemProvider()
    provider.registerFileRepresentation(forTypeIdentifier: UTType.data.identifier, fileOptions: [], visibility: .all) { callback in
      Task {
        await entered.open()
        await release.wait()
        callback(source, false, nil)
      }
      return nil
    }
    _ = await coordinator.load(attachments: [provider], accompanyingText: nil)
    await entered.wait()
    let cancel = Task { await coordinator.cancel() }
    await coordinator.waitForState(.cancelling)
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("drafts/cancel-provider").path))
    await release.open()
    let cancelled = await cancel.value
    XCTAssertTrue(cancelled)
    XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("drafts/cancel-provider").path))
    XCTAssertEqual(try Data(contentsOf: source).count, 512_000)
  }

  func testEditedTextSharesCopiedFileBudgetAndCount() async throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let source = root.appendingPathComponent("source.bin")
    try Data(repeating: 65, count: 6).write(to: source)
    let store = try OneShareTargetDraftStore(directory: root.appendingPathComponent("drafts"))
    let coordinator = OneShareTargetSubmissionCoordinator(configuration: .init(appGroupIdentifier: "test", acceptedFileTypeIdentifiers: [UTType.data.identifier], maxItems: 1, maxItemBytes: 8, maxTotalBytes: 8), adapter: RecordingAdapter(), draftStore: store)
    await coordinator.load(attachments: [NSItemProvider(contentsOf: source)!], accompanyingText: nil).value
    let budget = await coordinator.textByteBudget
    XCTAssertEqual(budget, 2)
    await coordinator.updateText("abc")
    let sendable = await coordinator.isSendable
    XCTAssertFalse(sendable)
    guard case .failure = await coordinator.send() else { return XCTFail("file and edited text exceeded total/count") }
    await coordinator.updateText("a")
    let countSendable = await coordinator.isSendable
    XCTAssertFalse(countSendable, "text plus file exceed maxItems=1 even within byte budget")
    _ = await coordinator.cancel()
  }

  func testCaptionMetadataDuplicateDoesNotConsumeSecondItemOrBytes() async throws {
    let intake = OneShareTargetIntake(configuration: .init(appGroupIdentifier: "test", maxItems: 1, maxItemBytes: 7, maxTotalBytes: 7))
    let items = try await intake.intake(attachments: [NSItemProvider(item: "caption" as NSString, typeIdentifier: UTType.plainText.identifier)], accompanyingText: "caption", destinationDirectory: FileManager.default.temporaryDirectory, isCancelled: { false })
    XCTAssertEqual(items, [.text("caption")])
    do {
      _ = try await intake.intake(attachments: [NSItemProvider(item: "other" as NSString, typeIdentifier: UTType.plainText.identifier)], accompanyingText: "caption", destinationDirectory: FileManager.default.temporaryDirectory, isCancelled: { false })
      XCTFail("distinct caption plus provider must count as two items")
    } catch { }
  }

  func testSystemCaptionProviderDuplicateIsConsumedExactlyOnce() async throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = try OneShareTargetDraftStore(directory: root)
    let coordinator = OneShareTargetSubmissionCoordinator(configuration: .init(appGroupIdentifier: "test"), adapter: RecordingAdapter(), draftStore: store)
    await coordinator.load(attachments: [NSItemProvider(item: "caption" as NSString, typeIdentifier: UTType.plainText.identifier)], accompanyingText: "caption").value
    let text = await coordinator.text
    XCTAssertEqual(text, "caption")
    _ = await coordinator.cancel()
  }

  func testRestoredDraftAndDestinationRetryKeepIdentity() async throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: root) }
    let store = try OneShareTargetDraftStore(directory: root)
    try await store.save(.init(id: "retry", destinationId: "d", text: "saved edit", items: [.url(URL(string: "https://example.com")!)]))
    let adapter = RetryAdapter()
    let coordinator = OneShareTargetSubmissionCoordinator(submissionId: "retry", configuration: .init(appGroupIdentifier: "test"), adapter: adapter, draftStore: store)
    await coordinator.load(attachments: [], accompanyingText: "must not overwrite").value
    let failed = await coordinator.state
    XCTAssertEqual(failed, .failed)
    await coordinator.load(attachments: [], accompanyingText: nil).value
    let ready = await coordinator.state
    XCTAssertEqual(ready, .ready)
    _ = await coordinator.send()
    let draft = try await store.load(submissionId: "retry")
    XCTAssertEqual(draft?.text, "saved edit")
    await coordinator.updateText("ambiguous edited retry must be refused")
    await coordinator.selectDestination("other")
    let cancelled = await coordinator.cancel()
    XCTAssertFalse(cancelled)
    // Reopen the actual pending manifest as if the extension process died.
    let restored = OneShareTargetSubmissionCoordinator(submissionId: "retry", configuration: .init(appGroupIdentifier: "test"), adapter: adapter, draftStore: store)
    let restoredLoad = await restored.load(attachments: [], accompanyingText: "new content must not replace attempt")
    let recoveryCancelled = await restored.cancel()
    XCTAssertFalse(recoveryCancelled, "recovery must never discard an ambiguous attempt")
    await restoredLoad.value
    await restored.updateText("also refused after recovery")
    _ = await restored.send()
    let attempts = await adapter.attempts
    XCTAssertEqual(attempts.first, attempts.last, "all retry content must remain byte-for-byte equal at the native adapter boundary")
    XCTAssertEqual(attempts.map(\.id), ["retry", "retry"])
    XCTAssertEqual(attempts.map(\.text), ["saved edit", "saved edit"])
    let removed = try await store.load(submissionId: "retry")
    XCTAssertNil(removed)
  }
}

private actor SaveGate {
  let entered = EventGate()
  let release = EventGate()
  private var armed = false
  func arm() { armed = true }
  func before(_ draft: OneShareTargetDraft) async {
    guard armed else { return }
    armed = false
    await entered.open()
    await release.wait()
  }
}

private final class ProviderGate: @unchecked Sendable {
  let entered = EventGate()
  private let lock = NSLock()
  private var callback: (@Sendable (Data?, Error?) -> Void)?
  func begin(_ callback: @escaping @Sendable (Data?, Error?) -> Void) {
    lock.lock(); self.callback = callback; lock.unlock()
    Task { await entered.open() }
  }
  func complete() {
    lock.lock(); let callback = callback; self.callback = nil; lock.unlock()
    callback?(Data("incoming".utf8), nil)
  }
}

private actor RetryAdapter: OneShareTargetAdapter {
  private var loads = 0
  var attempts: [OneShareSubmission] = []
  init() {}
  func destinations() async throws -> [OneShareDestination] {
    loads += 1
    if loads == 1 { throw OneShareTargetError.noAcceptedRepresentation }
    return [.init(id: "d", title: "Destination"), .init(id: "other", title: "Other")]
  }
  func send(submission: OneShareSubmission) async throws {
    attempts.append(submission)
    if attempts.count == 1 { throw OneShareTargetError.noAcceptedRepresentation }
  }
}
