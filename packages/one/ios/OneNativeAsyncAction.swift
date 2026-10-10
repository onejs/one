import Foundation

@MainActor
enum OneNativeAsyncAction {
  private static var pending: [String: CheckedContinuation<Void, Never>] = [:]
  private static var pendingStrings: [String: CheckedContinuation<String, any Error>] = [:]

  static func wait(name: String, value: String? = nil, emit: @escaping (String, String) -> Void) async {
    let identifier = UUID().uuidString
    await withTaskCancellationHandler {
      await withCheckedContinuation { continuation in
        if Task.isCancelled {
          continuation.resume()
          return
        }
        pending[identifier] = continuation
        if let value {
          guard let data = try? JSONEncoder().encode(["id": identifier, "value": value]),
            let encoded = String(data: data, encoding: .utf8) else {
            preconditionFailure("invalid async SDK event")
          }
          emit(name, encoded)
        } else {
          emit(name, identifier)
        }
      }
    } onCancel: {
      Task { @MainActor in complete(identifier) }
    }
  }

  static func complete(_ identifier: String) {
    pending.removeValue(forKey: identifier)?.resume()
  }

  static func waitForString(name: String, value: String, emit: @escaping (String, String) -> Void) async throws -> String {
    let identifier = UUID().uuidString
    return try await withTaskCancellationHandler {
      try await withCheckedThrowingContinuation { continuation in
        if Task.isCancelled {
          continuation.resume(throwing: CancellationError())
          return
        }
        pendingStrings[identifier] = continuation
        guard let data = try? JSONEncoder().encode(["id": identifier, "value": value]),
          let encoded = String(data: data, encoding: .utf8) else {
          preconditionFailure("invalid async SDK string event")
        }
        emit(name, encoded)
      }
    } onCancel: {
      Task { @MainActor in completeString(identifier, value: nil, error: "cancelled") }
    }
  }

  static func completeString(_ identifier: String, value: String?, error: String?) {
    guard let continuation = pendingStrings.removeValue(forKey: identifier) else { return }
    if let error {
      continuation.resume(throwing: NSError(domain: "OneNativeAsyncAction", code: 1,
        userInfo: [NSLocalizedDescriptionKey: error]))
    } else if let value {
      continuation.resume(returning: value)
    } else {
      continuation.resume(throwing: NSError(domain: "OneNativeAsyncAction", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "missing async SDK string result"]))
    }
  }
}

@objc(OneNativeAsyncActionModule)
final class OneNativeAsyncActionModule: NSObject {
  @objc func complete(_ identifier: String) {
    Task { @MainActor in OneNativeAsyncAction.complete(identifier) }
  }

  @objc func completeString(_ identifier: String, value: String?, error: String?) {
    Task { @MainActor in OneNativeAsyncAction.completeString(identifier, value: value, error: error) }
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }
}
