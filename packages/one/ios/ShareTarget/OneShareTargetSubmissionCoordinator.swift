import Foundation

public enum OneShareComposeState: Equatable, Sendable {
  case loading, ready, failed, sending, cancelling, delivered, cancelled
}

/// One durable compose session. Writes are ordered snapshots; terminal
/// deletion joins the same queue, so no suspended save can recreate a draft.
public actor OneShareTargetSubmissionCoordinator {
  public let submissionId: String
  private let configuration: OneShareTargetConfiguration
  private let adapter: any OneShareTargetAdapter
  private let draftStore: OneShareTargetDraftStore
  private let cancellationFlag = OneShareTargetCancellationFlag()
  public private(set) var state: OneShareComposeState = .loading {
    didSet {
      let matching = stateWaiters.filter { $0.0 == state }
      stateWaiters.removeAll { $0.0 == state }
      matching.forEach { $0.1.resume() }
    }
  }
  private var stateWaiters: [(OneShareComposeState, CheckedContinuation<Void, Never>)] = []

  // Event barrier for deterministic lifecycle probes; no scheduling guesses.
  func waitForState(_ expected: OneShareComposeState) async {
    if state == expected { return }
    await withCheckedContinuation { stateWaiters.append((expected, $0)) }
  }
  public private(set) var destinations: [OneShareDestination] = []
  public private(set) var selectedDestinationId: String?
  public private(set) var items: [OneSharedItem] = []
  public private(set) var text = ""
  public private(set) var lastError: String?
  private var loadTask: Task<Void, Never>?
  private var writeTask: Task<Void, Error>?
  private var destinationRequest: DestinationRequest?
  private var intakeCompleted = false
  private var textWasEdited = false
  private var isTerminal = false
  private var attemptedSubmission: OneShareSubmission?
  public var isDeliveryPending: Bool { attemptedSubmission != nil }

  public init(submissionId: String = UUID().uuidString,
              configuration: OneShareTargetConfiguration,
              adapter: any OneShareTargetAdapter, draftStore: OneShareTargetDraftStore) {
    self.submissionId = submissionId
    self.configuration = configuration
    self.adapter = adapter
    self.draftStore = draftStore
  }

  public var textByteCount: Int { text.utf8.count }
  public var textByteBudget: Int {
    max(0, min(configuration.maxItemBytes, configuration.maxTotalBytes - attachmentBytes))
  }
  private var attachmentBytes: Int { items.reduce(0) { $0 + OneShareTargetIntake.byteCount(of: $1) } }
  public var isSendable: Bool {
    if attemptedSubmission != nil { return state == .ready }
    return state == .ready && destinations.contains(where: { $0.id == selectedDestinationId })
      && (configuration.acceptsText || text.isEmpty)
      && textByteCount <= textByteBudget
      && items.count + (text.isEmpty ? 0 : 1) <= configuration.maxItems
      && items.allSatisfy { OneShareTargetIntake.byteCount(of: $0) <= configuration.maxItemBytes }
      && attachmentBytes <= configuration.maxTotalBytes
  }

  @discardableResult
  public func load(attachments: [NSItemProvider], accompanyingText: String?) -> Task<Void, Never> {
    if let loadTask, state != .failed { return loadTask }
    guard state == .loading || state == .failed else { return Task {} }
    state = .loading
    lastError = nil
    let task = Task { await self.runLoad(attachments: attachments, accompanyingText: accompanyingText) }
    loadTask = task
    return task
  }

  private func runLoad(attachments: [NSItemProvider], accompanyingText: String?) async {
    do {
      if !intakeCompleted {
        if let restored = try await draftStore.load(submissionId: submissionId) {
          items = restored.items
          if !textWasEdited { text = restored.text }
          selectedDestinationId = restored.destinationId
          if restored.pendingDelivery == true, let destinationId = restored.destinationId {
            attemptedSubmission = OneShareSubmission(id: restored.id, destinationId: destinationId, text: restored.text, items: restored.items)
            text = restored.text
            textWasEdited = false
          }
        } else {
          let directory = try await draftStore.itemsDirectory(forSubmissionId: submissionId)
          let copied = try await OneShareTargetIntake(configuration: configuration).intake(
            attachments: attachments, accompanyingText: accompanyingText, destinationDirectory: directory,
            isCancelled: { [cancellationFlag] in cancellationFlag.isCancelled })
          if cancellationFlag.isCancelled { return }
          // Text belongs to the editable submission, exactly once. URLs stay typed
          // attachments with the system preview, rather than becoming text copies.
          let textParts = copied.compactMap { item -> String? in
            if case .text(let value) = item { return value }; return nil
          }
          let initial = textParts.joined(separator: "\n")
          items = copied.filter { if case .text = $0 { return false }; return true }
          if !textWasEdited { text = initial }
        }
        if cancellationFlag.isCancelled { return }
        intakeCompleted = true
        try await persistNow()
      }
      if cancellationFlag.isCancelled { return }
      // A recovered attempt already has a fixed destination. Listing failure
      // must not strand its exact retry, or change its attempted payload.
      if attemptedSubmission != nil { state = .ready; return }
      let request = DestinationRequest()
      destinationRequest = request
      let adapter = adapter
      // Unstructured intentionally: cancellation does not await an adapter
      // that ignores cancellation. Only the winning result can update state.
      Task {
        do { request.resolve(.success(try await adapter.destinations())) }
        catch { request.resolve(.failure(error)) }
      }
      let loaded = try await request.value()
      destinationRequest = nil
      if cancellationFlag.isCancelled { return }
      destinations = loaded
      if !loaded.contains(where: { $0.id == selectedDestinationId }) {
        selectedDestinationId = loaded.first?.id
      }
      try await persistNow()
      if cancellationFlag.isCancelled { return }
      state = .ready
    } catch {
      guard !cancellationFlag.isCancelled else { return }
      lastError = error.localizedDescription
      state = .failed
    }
  }

  public func updateText(_ newText: String) {
    guard attemptedSubmission == nil, state == .loading || state == .ready || state == .failed else { return }
    textWasEdited = true
    text = newText
    if intakeCompleted { _ = enqueueSave() }
  }

  public func selectDestination(_ id: String) {
    guard attemptedSubmission == nil, state == .ready, destinations.contains(where: { $0.id == id }) else { return }
    selectedDestinationId = id
    _ = enqueueSave()
  }

  private func enqueueSave() -> Task<Void, Error>? {
    guard !isTerminal else { return nil }
    let previous = writeTask
    let store = draftStore
    let draft = OneShareTargetDraft(id: submissionId, destinationId: selectedDestinationId, text: text, items: items, pendingDelivery: attemptedSubmission == nil ? nil : true)
    let task = Task {
      // A later full snapshot can recover from a prior failed write.
      _ = try? await previous?.value
      try await store.save(draft)
    }
    writeTask = task
    return task
  }

  private func persistNow() async throws {
    try await enqueueSave()?.value
  }

  private func discard() async throws {
    isTerminal = true
    _ = try? await writeTask?.value
    try await draftStore.discard(submissionId: submissionId)
  }

  @discardableResult
  public func send() async -> Result<Void, Error> {
    guard isSendable, let destinationId = selectedDestinationId else {
      return .failure(OneShareTargetError.invalidState)
    }
    state = .sending
    let submission = attemptedSubmission ?? OneShareSubmission(id: submissionId, destinationId: destinationId, text: text, items: items)
    // A thrown adapter result cannot distinguish rejection from lost
    // acknowledgement. Journal before calling it and freeze exact retries.
    attemptedSubmission = submission
    do {
      // Save the exact submitted snapshot before the adapter can accept it.
      try await persistNow()
      try await adapter.send(submission: submission)
      try await discard()
      state = .delivered
      lastError = nil
      return .success(())
    } catch {
      // Once accepted, deletion failure must not invite duplicate delivery.
      state = isTerminal ? .delivered : .ready
      lastError = error.localizedDescription
      return .failure(error)
    }
  }

  @discardableResult
  public func cancel() async -> Bool {
    guard attemptedSubmission == nil, state == .loading || state == .ready || state == .failed else { return false }
    state = .cancelling
    cancellationFlag.cancel()
    destinationRequest?.resolve(.failure(CancellationError()))
    // Provider callbacks must finish copying before deleting their directory.
    await loadTask?.value
    // Recovery can discover a journaled attempt after cancellation began.
    // Its ambiguous delivery is still protected from terminal deletion.
    if attemptedSubmission != nil { state = .ready; return false }
    do {
      try await discard()
      state = .cancelled
      return true
    } catch {
      lastError = error.localizedDescription
      state = .failed
      return false
    }
  }
}

/// A one-shot event race, with no polling or timeout. Late adapter results
/// have no reference to coordinator state or disk and are safely ignored.
private final class DestinationRequest: @unchecked Sendable {
  private let lock = NSLock()
  private var result: Result<[OneShareDestination], Error>?
  private var continuation: CheckedContinuation<[OneShareDestination], Error>?

  func resolve(_ result: Result<[OneShareDestination], Error>) {
    lock.lock()
    guard self.result == nil else { lock.unlock(); return }
    self.result = result
    let pending = continuation
    continuation = nil
    lock.unlock()
    pending?.resume(with: result)
  }

  func value() async throws -> [OneShareDestination] {
    try await withCheckedThrowingContinuation { continuation in
      lock.lock()
      if let result { lock.unlock(); continuation.resume(with: result) }
      else { self.continuation = continuation; lock.unlock() }
    }
  }
}
