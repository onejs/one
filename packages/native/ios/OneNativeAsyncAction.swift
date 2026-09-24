import Foundation

@MainActor
enum OneNativeAsyncAction {
  private static var pending: [String: CheckedContinuation<Void, Never>] = [:]

  static func wait(name: String, emit: @escaping (String, String) -> Void) async {
    let identifier = UUID().uuidString
    await withTaskCancellationHandler {
      await withCheckedContinuation { continuation in
        if Task.isCancelled {
          continuation.resume()
          return
        }
        pending[identifier] = continuation
        emit(name, identifier)
      }
    } onCancel: {
      Task { @MainActor in complete(identifier) }
    }
  }

  static func complete(_ identifier: String) {
    pending.removeValue(forKey: identifier)?.resume()
  }
}

@objc(OneNativeAsyncActionModule)
final class OneNativeAsyncActionModule: NSObject {
  @objc func complete(_ identifier: String) {
    Task { @MainActor in OneNativeAsyncAction.complete(identifier) }
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }
}
