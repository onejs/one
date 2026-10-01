// Standalone native contract for a One share-target adapter.
// Apple-frameworks-only: no React/Expo/One Nitro runtime dependency.
// Safe under APPLICATION_EXTENSION_API_ONLY.

import Foundation
import UniformTypeIdentifiers

/// `NSItemProvider` is not annotated `Sendable` upstream, but its documented
/// contract is a callback-based API designed to be handed across queues;
/// Apple's own completion handlers always fire off the calling thread. This
/// unblocks passing provider arrays from the (`@MainActor`) compose
/// controller into intake without a data-race diagnostic for a case the
/// framework already guarantees is safe.
extension NSItemProvider: @unchecked @retroactive Sendable {}

/// A lock-protected cancellation flag, safe to read from the arbitrary
/// background queues `NSItemProvider` invokes its completion handlers on.
/// Plain `@MainActor`-isolated state cannot be read from those closures
/// under strict concurrency checking.
public final class OneShareTargetCancellationFlag: @unchecked Sendable {
  private let lock = NSLock()
  private var value = false

  public init() {}

  public func cancel() {
    lock.lock()
    value = true
    lock.unlock()
  }

  public var isCancelled: Bool {
    lock.lock()
    defer { lock.unlock() }
    return value
  }
}

/// Copies the system Share sheet's `NSItemProvider` attachments into a
/// durable, app-group-local directory, enforcing count/size limits as it
/// goes. Never loads a whole attachment into memory and never silently
/// drops an attachment: every attachment either becomes exactly one
/// `OneSharedItem` or intake throws.
public struct OneShareTargetIntake: Sendable {
  public let configuration: OneShareTargetConfiguration

  public init(configuration: OneShareTargetConfiguration) {
    self.configuration = configuration
  }

  /// - Parameters:
  ///   - attachments: the extension item's `NSItemProvider` attachments.
  ///   - accompanyingText: the system compose text typed before an
  ///     attachment was picked (`NSExtensionItem.attributedContentText`),
  ///     preserved as its own text item.
  ///   - destinationDirectory: an app-group-local directory owned by this
  ///     draft; copied files are written under it.
  ///   - isCancelled: polled between and during copies; cancelling stops
  ///     copying immediately and removes any partial file.
  public func intake(
    attachments: [NSItemProvider],
    accompanyingText: String?,
    destinationDirectory: URL,
    isCancelled: @escaping @Sendable () -> Bool
  ) async throws -> [OneSharedItem] {
    var items: [OneSharedItem] = []
    var totalBytes = 0

    if let accompanyingText, !accompanyingText.isEmpty, configuration.acceptsText {
      items.append(.text(accompanyingText))
    }

    for provider in attachments {
      if isCancelled() { throw OneShareTargetError.intakeCancelled }
      guard items.count < configuration.maxItems else {
        throw OneShareTargetError.tooManyItems(limit: configuration.maxItems)
      }

      let item = try await intakeOne(
        provider: provider,
        destinationDirectory: destinationDirectory,
        remainingTotalBudget: configuration.maxTotalBytes - totalBytes,
        isCancelled: isCancelled
      )

      totalBytes += Self.byteCount(of: item)
      items.append(item)
    }

    return items
  }

  // MARK: - Per-attachment representation selection

  private func intakeOne(
    provider: NSItemProvider,
    destinationDirectory: URL,
    remainingTotalBudget: Int,
    isCancelled: @escaping @Sendable () -> Bool
  ) async throws -> OneSharedItem {
    // A URL representation wins first: many providers (Safari's page share,
    // for example) advertise both a plain-text title and a URL for the same
    // attachment, and the link is the representation worth keeping — losing
    // it in favor of its title text is strictly a worse outcome.
    if configuration.acceptsURL, provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
       !provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
      let url = try await loadURL(provider: provider, typeIdentifier: UTType.url.identifier)
      try Self.enforceItemBudget(
        byteCount: url.absoluteString.utf8.count,
        name: "url",
        remainingTotalBudget: remainingTotalBudget,
        configuration: configuration
      )
      return .url(url)
    }

    // Plain text, when accepted, is the next cheapest representation.
    if configuration.acceptsText, provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
      let string = try await loadText(provider: provider, typeIdentifier: UTType.plainText.identifier)
      try Self.enforceItemBudget(
        byteCount: string.utf8.count,
        name: "text",
        remainingTotalBudget: remainingTotalBudget,
        configuration: configuration
      )
      return .text(string)
    }

    // Otherwise fall through to the first accepted file type the provider
    // actually offers, in the app's declared preference order.
    for typeIdentifier in configuration.acceptedFileTypeIdentifiers {
      guard provider.hasItemConformingToTypeIdentifier(typeIdentifier) else { continue }
      let itemBudget = try Self.itemBudget(remainingTotalBudget: remainingTotalBudget, configuration: configuration)
      return .file(
        try await loadAndCopyFile(
          provider: provider,
          typeIdentifier: typeIdentifier,
          destinationDirectory: destinationDirectory,
          itemBudget: itemBudget,
          isCancelled: isCancelled
        )
      )
    }

    throw OneShareTargetError.unsupportedAttachment(
      typeIdentifier: provider.registeredTypeIdentifiers.first ?? "unknown"
    )
  }

  private static func byteCount(of item: OneSharedItem) -> Int {
    switch item {
    case .text(let value): return value.utf8.count
    case .url(let value): return value.absoluteString.utf8.count
    case .file(let value): return value.byteCount
    }
  }

  /// The remaining per-item budget, or throws `totalTooLarge` if the total
  /// budget is already exhausted. Shared by every representation kind so
  /// text and URL items are bounded exactly like file items are.
  private static func itemBudget(remainingTotalBudget: Int, configuration: OneShareTargetConfiguration) throws -> Int {
    guard remainingTotalBudget > 0 else {
      throw OneShareTargetError.totalTooLarge(limit: configuration.maxTotalBytes)
    }
    return min(configuration.maxItemBytes, remainingTotalBudget)
  }

  private static func enforceItemBudget(
    byteCount: Int,
    name: String,
    remainingTotalBudget: Int,
    configuration: OneShareTargetConfiguration
  ) throws {
    let budget = try itemBudget(remainingTotalBudget: remainingTotalBudget, configuration: configuration)
    guard byteCount <= budget else {
      throw OneShareTargetError.itemTooLarge(name: name, limit: budget)
    }
  }

  // MARK: - Loaders

  private func loadText(provider: NSItemProvider, typeIdentifier: String) async throws -> String {
    try await withCheckedThrowingContinuation { continuation in
      provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { value, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        switch value {
        case let string as String:
          continuation.resume(returning: string)
        case let data as Data:
          continuation.resume(returning: String(decoding: data, as: UTF8.self))
        default:
          continuation.resume(throwing: OneShareTargetError.noAcceptedRepresentation)
        }
      }
    }
  }

  private func loadURL(provider: NSItemProvider, typeIdentifier: String) async throws -> URL {
    try await withCheckedThrowingContinuation { continuation in
      provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { value, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        switch value {
        case let url as URL:
          continuation.resume(returning: url)
        case let data as Data:
          if let url = URL(dataRepresentation: data, relativeTo: nil) {
            continuation.resume(returning: url)
          } else {
            continuation.resume(throwing: OneShareTargetError.noAcceptedRepresentation)
          }
        default:
          continuation.resume(throwing: OneShareTargetError.noAcceptedRepresentation)
        }
      }
    }
  }

  /// Loads a file representation and chunk-copies it into
  /// `destinationDirectory` without ever materializing it as a single
  /// in-memory `Data` or decoding it as an image. `NSItemProvider` only
  /// guarantees the source URL is valid for the duration of the completion
  /// handler, so the copy (and its size enforcement) happens synchronously
  /// inside that handler.
  private func loadAndCopyFile(
    provider: NSItemProvider,
    typeIdentifier: String,
    destinationDirectory: URL,
    itemBudget: Int,
    isCancelled: @escaping @Sendable () -> Bool
  ) async throws -> OneSharedFile {
    let suggestedName = provider.suggestedName
    return try await withCheckedThrowingContinuation { continuation in
      let progress = provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { sourceURL, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        guard let sourceURL else {
          continuation.resume(throwing: OneShareTargetError.noAcceptedRepresentation)
          return
        }
        let itemDirectory = destinationDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
          let fileName = Self.sanitizedFileName(suggestedName ?? sourceURL.lastPathComponent)
          try FileManager.default.createDirectory(at: itemDirectory, withIntermediateDirectories: true)
          let destinationFile = itemDirectory.appendingPathComponent(fileName)

          let byteCount = try Self.copyBounded(
            from: sourceURL,
            to: destinationFile,
            budget: itemBudget,
            isCancelled: isCancelled
          )

          let mimeType = UTType(typeIdentifier)?.preferredMIMEType ?? "application/octet-stream"
          continuation.resume(returning: OneSharedFile(
            url: destinationFile,
            name: fileName,
            mimeType: mimeType,
            byteCount: byteCount
          ))
        } catch {
          // copyBounded only ever leaves its own destination file behind on
          // failure; remove the whole per-item directory so a rejected or
          // cancelled copy leaves nothing on disk.
          try? FileManager.default.removeItem(at: itemDirectory)
          continuation.resume(throwing: error)
        }
      }
      _ = progress
    }
  }

  // MARK: - Bounded copy

  private static let chunkSize = 256 * 1024

  /// Copies `source` to `destination` in fixed-size chunks, checking the
  /// cancellation flag and the byte budget on every chunk. Never reads the
  /// whole source into memory. On cancellation or overrun the partial
  /// destination file is removed and the error is thrown.
  private static func copyBounded(
    from source: URL,
    to destination: URL,
    budget: Int,
    isCancelled: @escaping @Sendable () -> Bool
  ) throws -> Int {
    guard FileManager.default.createFile(atPath: destination.path, contents: nil) else {
      throw OneShareTargetError.noAcceptedRepresentation
    }
    let input = try FileHandle(forReadingFrom: source)
    defer { try? input.close() }
    let output = try FileHandle(forWritingTo: destination)
    defer { try? output.close() }

    var copied = 0
    while true {
      if isCancelled() {
        try? output.close()
        try? FileManager.default.removeItem(at: destination)
        throw OneShareTargetError.intakeCancelled
      }
      let chunk = input.readData(ofLength: chunkSize)
      if chunk.isEmpty { break }
      copied += chunk.count
      if copied > budget {
        try? output.close()
        try? FileManager.default.removeItem(at: destination)
        throw OneShareTargetError.itemTooLarge(name: destination.lastPathComponent, limit: budget)
      }
      output.write(chunk)
    }
    return copied
  }

  private static func sanitizedFileName(_ name: String) -> String {
    let disallowed = CharacterSet(charactersIn: "/\\:")
    let cleaned = name.components(separatedBy: disallowed).joined(separator: "_")
    return cleaned.isEmpty ? UUID().uuidString : cleaned
  }
}
