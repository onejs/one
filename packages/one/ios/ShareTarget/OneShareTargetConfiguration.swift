// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Foundation

/// Static, app-provided configuration for the extension. `appGroupIdentifier`
/// must match an app-group entitlement shared by the host app and this
/// extension; it is where durable drafts and copied attachment files live.
public struct OneShareTargetConfiguration: Sendable, Equatable {
  public let appGroupIdentifier: String
  public let acceptsText: Bool
  public let acceptsURL: Bool
  /// UTType identifiers (e.g. "public.image") accepted as file attachments,
  /// in preference order. Empty means no file attachments are accepted.
  public let acceptedFileTypeIdentifiers: [String]
  public let maxItems: Int
  public let maxItemBytes: Int
  public let maxTotalBytes: Int

  public init(
    appGroupIdentifier: String,
    acceptsText: Bool = true,
    acceptsURL: Bool = true,
    acceptedFileTypeIdentifiers: [String] = [],
    maxItems: Int = 5,
    maxItemBytes: Int = 10 * 1024 * 1024,
    maxTotalBytes: Int = 40 * 1024 * 1024
  ) {
    self.appGroupIdentifier = appGroupIdentifier
    self.acceptsText = acceptsText
    self.acceptsURL = acceptsURL
    self.acceptedFileTypeIdentifiers = acceptedFileTypeIdentifiers
    self.maxItems = maxItems
    self.maxItemBytes = maxItemBytes
    self.maxTotalBytes = maxTotalBytes
  }
}
