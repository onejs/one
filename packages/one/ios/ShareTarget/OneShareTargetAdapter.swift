// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Foundation

/// One destination a share submission can be sent to (for example a session or chat).
public struct OneShareDestination: Sendable, Equatable, Identifiable {
  public let id: String
  public let title: String
  public let subtitle: String?

  public init(id: String, title: String, subtitle: String? = nil) {
    self.id = id
    self.title = title
    self.subtitle = subtitle
  }
}

/// A single accepted shared item. Exactly one representation is chosen per
/// incoming attachment during intake; nothing here is multi-representation.
public enum OneSharedItem: Sendable, Equatable, Codable {
  case text(String)
  case url(URL)
  case file(OneSharedFile)

  private enum CodingKeys: String, CodingKey {
    case kind, text, url, file
  }

  private enum Kind: String, Codable {
    case text, url, file
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    switch try container.decode(Kind.self, forKey: .kind) {
    case .text:
      self = .text(try container.decode(String.self, forKey: .text))
    case .url:
      self = .url(try container.decode(URL.self, forKey: .url))
    case .file:
      self = .file(try container.decode(OneSharedFile.self, forKey: .file))
    }
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    switch self {
    case .text(let value):
      try container.encode(Kind.text, forKey: .kind)
      try container.encode(value, forKey: .text)
    case .url(let value):
      try container.encode(Kind.url, forKey: .kind)
      try container.encode(value, forKey: .url)
    case .file(let value):
      try container.encode(Kind.file, forKey: .kind)
      try container.encode(value, forKey: .file)
    }
  }
}

/// A file copied into the app-group container during intake. `url` is owned by
/// the draft that produced it and stays valid until that draft is delivered or
/// discarded.
public struct OneSharedFile: Sendable, Equatable, Codable {
  public let url: URL
  public let name: String
  public let mimeType: String
  public let byteCount: Int

  public init(url: URL, name: String, mimeType: String, byteCount: Int) {
    self.url = url
    self.name = name
    self.mimeType = mimeType
    self.byteCount = byteCount
  }
}

/// A durable, user-edited submission ready to send. `id` is the stable
/// submission/draft identifier; it never changes for the lifetime of a draft.
public struct OneShareSubmission: Sendable, Equatable, Codable {
  public let id: String
  public let destinationId: String
  public let text: String
  public let items: [OneSharedItem]

  public init(id: String, destinationId: String, text: String, items: [OneSharedItem]) {
    self.id = id
    self.destinationId = destinationId
    self.text = text
    self.items = items
  }
}

/// Errors surfaced by intake, drafting, or send. Every failure path is a
/// typed case: there are no silent drops.
public enum OneShareTargetError: Error, Sendable, Equatable {
  case missingAppGroupContainer(String)
  case tooManyItems(limit: Int)
  case itemTooLarge(name: String, limit: Int)
  case totalTooLarge(limit: Int)
  case unsupportedAttachment(typeIdentifier: String)
  case noAcceptedRepresentation
  case intakeCancelled
}

/// Implemented once per app, by generated code. An adapter is a pure
/// protocol boundary: it knows how to list destinations and how to deliver a
/// submission. It must not assume any One/Nitro runtime is loaded, since the
/// Share extension process never loads the main app's JS bundle.
public protocol OneShareTargetAdapter: Sendable {
  init()

  /// Bounded, best-effort list of destinations a submission may go to.
  /// Implementations should keep this fast and should not block on a full
  /// network sync; staleness is the adapter's responsibility to communicate
  /// through `OneShareDestination.subtitle` if relevant.
  func destinations() async throws -> [OneShareDestination]

  /// Deliver a submission. Throwing leaves the originating draft untouched
  /// so the caller can retry; returning normally means delivery is durably
  /// accepted (not necessarily yet applied) and the draft may be discarded.
  func send(submission: OneShareSubmission) async throws
}
