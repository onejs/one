// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Foundation

/// A durable draft: the edited text and copied items for one submission,
/// keyed by its stable submission id. Surviving process death (the Share
/// extension is routinely killed) is the entire point of persisting this
/// before attempting to send.
public struct OneShareTargetDraft: Sendable, Equatable, Codable {
  public let id: String
  public let destinationId: String?
  public let text: String
  public let items: [OneSharedItem]
  public let createdAt: Date

  public init(id: String, destinationId: String?, text: String, items: [OneSharedItem], createdAt: Date = Date()) {
    self.id = id
    self.destinationId = destinationId
    self.text = text
    self.items = items
    self.createdAt = createdAt
  }
}

/// Persists drafts under the shared app-group container, one directory per
/// submission id. File URLs recorded in a draft's items live inside that
/// same directory, so they stay valid for exactly as long as the draft does.
public actor OneShareTargetDraftStore {
  private let draftsDirectory: URL

  public init(appGroupIdentifier: String) throws {
    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else {
      throw OneShareTargetError.missingAppGroupContainer(appGroupIdentifier)
    }
    do {
      try self.init(directory: container.appendingPathComponent("OneShareTarget/Drafts", isDirectory: true))
    } catch {
      // A non-nil container that can't actually be created in (wrong
      // entitlement, unprovisioned group) is indistinguishable from a
      // missing one as far as the caller is concerned.
      throw OneShareTargetError.missingAppGroupContainer(appGroupIdentifier)
    }
  }

  /// Points the store at an arbitrary directory instead of resolving one
  /// from an app-group identifier. Production code should use
  /// `init(appGroupIdentifier:)`; this exists so the store's save/load/
  /// discard behavior can be exercised outside an app-group entitlement
  /// (for example in a standalone test harness).
  public init(directory: URL) throws {
    draftsDirectory = directory
    try FileManager.default.createDirectory(at: draftsDirectory, withIntermediateDirectories: true)
  }

  /// Directory a submission's copied item files should be written into.
  /// Call before intake so file URLs land under the draft's own directory.
  public func itemsDirectory(forSubmissionId submissionId: String) throws -> URL {
    let directory = draftDirectory(for: submissionId)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  public func save(_ draft: OneShareTargetDraft) throws {
    let directory = draftDirectory(for: draft.id)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    let data = try encoder.encode(draft)
    try data.write(to: manifestURL(for: draft.id), options: .atomic)
  }

  public func load(submissionId: String) throws -> OneShareTargetDraft? {
    let manifest = manifestURL(for: submissionId)
    guard FileManager.default.fileExists(atPath: manifest.path) else { return nil }
    let data = try Data(contentsOf: manifest)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try decoder.decode(OneShareTargetDraft.self, from: data)
  }

  /// Removes a draft and its copied files. Call only after delivery is
  /// durably accepted, or when the user explicitly cancels/discards.
  public func discard(submissionId: String) throws {
    let directory = draftDirectory(for: submissionId)
    guard FileManager.default.fileExists(atPath: directory.path) else { return }
    try FileManager.default.removeItem(at: directory)
  }

  public func allSubmissionIds() -> [String] {
    (try? FileManager.default.contentsOfDirectory(atPath: draftsDirectory.path)) ?? []
  }

  private func draftDirectory(for submissionId: String) -> URL {
    draftsDirectory.appendingPathComponent(submissionId, isDirectory: true)
  }

  private func manifestURL(for submissionId: String) -> URL {
    draftDirectory(for: submissionId).appendingPathComponent("draft.json")
  }
}
