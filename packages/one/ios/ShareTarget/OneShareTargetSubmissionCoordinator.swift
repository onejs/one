// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Foundation

/// The lifecycle of one compose session. Every public action on
/// `OneShareTargetSubmissionCoordinator` is gated by this state: there is no
/// path to send twice, to cancel a delivery that may already be accepted, or
/// to edit after the draft has been discarded.
public enum OneShareComposeState: Equatable, Sendable {
  case loading
  /// Intake and `destinations()` both succeeded; the user may edit, pick a
  /// destination, send, or cancel.
  case ready
  /// Loading finished but `destinations()` failed; there is nothing to send
  /// to, but the already-copied items remain persisted and cancel still works.
  case failed
  case sending
  case cancelling
  case delivered
  case cancelled
}

/// Orchestrates one share submission's lifecycle (intake, edit, send,
/// cancel) independent of any UI framework, so the sequencing that matters
/// most here — the races a Share extension's abrupt teardown invites — can
/// be exercised by a real test instead of only typechecked.
///
/// Three invariants this type exists to hold:
/// - Cancelling awaits the in-flight load (intake copy + persist) before
///   discarding, so a persist that finishes after a naive discard can never
///   recreate a cancelled draft.
/// - Once a submission may have been accepted (`send()` has been called),
///   no later action can discard or overwrite its draft except the send's
///   own completion; a concurrent `cancel()` is refused outright.
/// - A `destinations()` failure never loses already-copied items: they are
///   persisted before `destinations()` runs, not after.
public actor OneShareTargetSubmissionCoordinator {
  public let submissionId: String
  private let configuration: OneShareTargetConfiguration
  private let adapter: any OneShareTargetAdapter
  private let draftStore: OneShareTargetDraftStore
  private let intake: OneShareTargetIntake
  private let cancellationFlag = OneShareTargetCancellationFlag()

  public private(set) var state: OneShareComposeState = .loading
  public private(set) var destinations: [OneShareDestination] = []
  public private(set) var selectedDestinationId: String?
  public private(set) var items: [OneSharedItem] = []
  public private(set) var text: String = ""
  public private(set) var lastError: String?

  /// Once true, no persist may run: the draft has been (or is being)
  /// discarded by a cancel or a successful send.
  private var isTerminal = false

  private var loadTask: Task<Void, Never>?
  private var persistTask: Task<Void, Never>?

  public init(
    submissionId: String = UUID().uuidString,
    configuration: OneShareTargetConfiguration,
    adapter: any OneShareTargetAdapter,
    draftStore: OneShareTargetDraftStore
  ) {
    self.submissionId = submissionId
    self.configuration = configuration
    self.adapter = adapter
    self.draftStore = draftStore
    self.intake = OneShareTargetIntake(configuration: configuration)
  }

  public var isSendable: Bool {
    state == .ready
      && selectedDestinationId != nil
      && !destinations.isEmpty
      && text.utf8.count <= configuration.maxItemBytes
  }

  public var textByteCount: Int { text.utf8.count }
  public var textByteBudget: Int { configuration.maxItemBytes }

  // MARK: - Load

  /// Starts intake + destination loading. A second call while a load is
  /// already in flight (or finished) returns the same task rather than
  /// starting a competing one.
  @discardableResult
  public func load(attachments: [NSItemProvider], accompanyingText: String?) -> Task<Void, Never> {
    if let loadTask { return loadTask }
    let task = Task { [weak self] () -> Void in
      await self?.runLoad(attachments: attachments, accompanyingText: accompanyingText)
    }
    loadTask = task
    return task
  }

  private func runLoad(attachments: [NSItemProvider], accompanyingText: String?) async {
    do {
      let itemsDirectory = try await draftStore.itemsDirectory(forSubmissionId: submissionId)
      let copied = try await intake.intake(
        attachments: attachments,
        accompanyingText: accompanyingText,
        destinationDirectory: itemsDirectory,
        isCancelled: { [cancellationFlag] in cancellationFlag.isCancelled }
      )
      if cancellationFlag.isCancelled { return }

      items = copied
      text = accompanyingText ?? ""

      // Persist before destinations() runs: a destinations() failure below
      // must still leave a recoverable draft for the items already copied
      // to disk, never a silent drop of work already done.
      try await persistNow()
      if cancellationFlag.isCancelled { return }

      do {
        let loadedDestinations = try await adapter.destinations()
        if cancellationFlag.isCancelled { return }
        destinations = loadedDestinations
        selectedDestinationId = loadedDestinations.first?.id
        try await persistNow()
        state = .ready
      } catch {
        lastError = error.localizedDescription
        state = .failed
      }
    } catch is CancellationError {
    } catch let error as OneShareTargetError where error == .intakeCancelled {
    } catch {
      lastError = error.localizedDescription
      state = .failed
    }
  }

  // MARK: - Edit

  public func updateText(_ newText: String) {
    guard state == .ready else { return }
    text = newText
    schedulePersist()
  }

  public func selectDestination(_ id: String) {
    guard state == .ready, destinations.contains(where: { $0.id == id }) else { return }
    selectedDestinationId = id
    schedulePersist()
  }

  private func schedulePersist() {
    persistTask?.cancel()
    persistTask = Task { [weak self] () -> Void in
      try? await self?.persistNow()
    }
  }

  /// Internal rather than private so a test can call it directly to prove
  /// the `isTerminal` guard below: the real race this guards against (a
  /// persist landing on the `draftStore` actor after a concurrent cancel/
  /// send has already discarded it) depends on exact scheduling between two
  /// actors, which isn't something a test can force deterministically --
  /// calling this after cancel()/send() exercises the same guard check a
  /// real race would hit.
  func persistNow() async throws {
    // Re-checked here (not just by callers) so a persist queued before a
    // cancel/send landed, but executed after, is still refused: isTerminal
    // is read fresh at the moment of the actual write, after any awaits.
    guard !isTerminal else { return }
    let draft = OneShareTargetDraft(id: submissionId, destinationId: selectedDestinationId, text: text, items: items)
    try await draftStore.save(draft)
  }

  // MARK: - Send

  /// Attempts delivery. Once this enters `.sending`, `cancel()` is refused
  /// until it resolves: a submission that may already be accepted on the far
  /// end must never be presented as cancellable.
  @discardableResult
  public func send() async -> Result<Void, Error> {
    guard state == .ready, let destinationId = selectedDestinationId else {
      return .failure(OneShareTargetError.invalidState)
    }
    state = .sending
    let submission = OneShareSubmission(id: submissionId, destinationId: destinationId, text: text, items: items)
    do {
      try await adapter.send(submission: submission)
      isTerminal = true
      try? await draftStore.discard(submissionId: submissionId)
      state = .delivered
      return .success(())
    } catch {
      guard state == .sending else { return .failure(error) }
      state = .ready
      lastError = error.localizedDescription
      return .failure(error)
    }
  }

  // MARK: - Cancel

  /// Cancels loading or discards a ready/failed draft. Refused once sending
  /// may have been accepted, or after a terminal state is already reached.
  /// Awaits the in-flight load and any queued persist before discarding, so
  /// neither can write a file after this call has removed the draft
  /// directory — the fix for a cancel that raced a pending copy/persist and
  /// ended up recreating the "cancelled" draft.
  @discardableResult
  public func cancel() async -> Bool {
    guard state == .loading || state == .ready || state == .failed else { return false }
    state = .cancelling
    cancellationFlag.cancel()
    await loadTask?.value
    await persistTask?.value
    isTerminal = true
    try? await draftStore.discard(submissionId: submissionId)
    state = .cancelled
    return true
  }
}
