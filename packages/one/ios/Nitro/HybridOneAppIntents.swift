import Foundation
import NitroModules

@objc(OneAppIntentsCoordinator)
public final class OneAppIntentsCoordinator: NSObject {
  @objc public static let shared = OneAppIntentsCoordinator()
  private static let handlerTimeoutSeconds: TimeInterval = 20

  private struct Running {
    let identifier: String
    let text: String?
    let finish: (String?, NSError?) -> Void
    var delivered: Bool
  }

  private struct Listener {
    let id: UUID
    let callback: (AppIntentInvocation) -> Void
  }

  private var startHost: (() -> Void)?
  private var listeners: [String: Listener] = [:]
  private var running: [String: Running] = [:]

  private override init() {}

  private var configuredIds: [String] {
    Bundle.main.object(forInfoDictionaryKey: "OneAppIntentIdentifiers") as? [String] ?? []
  }

  @objc(registerWithStartHost:)
  public func register(startHost: @escaping () -> Void) {
    precondition(Thread.isMainThread)
    self.startHost = startHost
  }

  @objc(performWithIdentifier:text:completion:)
  public func perform(
    identifier: String,
    text: String?,
    completion: @escaping (String?, NSError?) -> Void
  ) {
    DispatchQueue.main.async {
      guard self.configuredIds.contains(identifier) else {
        completion(nil, Self.error(2, "E_APP_INTENTS_INPUT: action is not configured"))
        return
      }
      let executionId = UUID().uuidString
      self.running[executionId] = Running(
        identifier: identifier, text: text, finish: completion, delivered: false)
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.handlerTimeoutSeconds) { [weak self] in
        guard let request = self?.running.removeValue(forKey: executionId) else { return }
        request.finish(nil, Self.error(1, "E_APP_INTENTS_TIMEOUT: action handler did not finish within 20 seconds"))
      }
      if self.listeners[identifier] == nil { self.startHost?() }
      self.deliver(executionId)
    }
  }

  private static func error(_ code: Int, _ message: String) -> NSError {
    NSError(domain: "OneAppIntents", code: code,
      userInfo: [NSLocalizedDescriptionKey: message])
  }

  private func deliver(_ executionId: String) {
    precondition(Thread.isMainThread)
    guard var request = running[executionId], !request.delivered,
      let listener = listeners[request.identifier] else { return }
    request.delivered = true
    running[executionId] = request
    listener.callback(AppIntentInvocation(executionId: executionId,
      identifier: request.identifier, text: request.text))
  }

  fileprivate func addListener(
    _ identifier: String,
    callback: @escaping (AppIntentInvocation) -> Void
  ) throws -> () -> Void {
    precondition(Thread.isMainThread)
    guard configuredIds.contains(identifier) else {
      throw oneNativeError("E_APP_INTENTS_INPUT", "AppIntents.defineAction: action is not configured")
    }
    let id = UUID()
    listeners[identifier] = Listener(id: id, callback: callback)
    return { [weak self] in
      DispatchQueue.main.async {
        guard self?.listeners[identifier]?.id == id else { return }
        self?.listeners.removeValue(forKey: identifier)
      }
    }
  }

  fileprivate func claimPending(_ identifier: String) throws -> [AppIntentInvocation] {
    precondition(Thread.isMainThread)
    guard configuredIds.contains(identifier) else {
      throw oneNativeError("E_APP_INTENTS_INPUT", "AppIntents.defineAction: action is not configured")
    }
    let ids = running.compactMap { executionId, request in
      request.identifier == identifier && !request.delivered ? executionId : nil
    }
    return ids.compactMap { executionId in
      guard var request = running[executionId] else { return nil }
      request.delivered = true
      running[executionId] = request
      return AppIntentInvocation(executionId: executionId,
        identifier: identifier, text: request.text)
    }
  }

  fileprivate func complete(_ executionId: String, success: Bool, output: String) {
    precondition(Thread.isMainThread)
    guard let request = running.removeValue(forKey: executionId) else { return }
    if success {
      request.finish(output, nil)
    } else {
      request.finish(nil, Self.error(2, "E_APP_INTENTS_HANDLER: \(output)"))
    }
  }
}

final class HybridOneAppIntents: HybridOneAppIntentsSpec {
  func addInvocationListener(
    identifier: String,
    listener: @escaping (AppIntentInvocation) -> Void
  ) throws -> () -> Void {
    if Thread.isMainThread {
      return try OneAppIntentsCoordinator.shared.addListener(identifier, callback: listener)
    }
    return try DispatchQueue.main.sync {
      try OneAppIntentsCoordinator.shared.addListener(identifier, callback: listener)
    }
  }

  func claimPending(identifier: String) throws -> [AppIntentInvocation] {
    if Thread.isMainThread {
      return try OneAppIntentsCoordinator.shared.claimPending(identifier)
    }
    return try DispatchQueue.main.sync {
      try OneAppIntentsCoordinator.shared.claimPending(identifier)
    }
  }

  func complete(executionId: String, success: Bool, output: String) throws {
    DispatchQueue.main.async {
      OneAppIntentsCoordinator.shared.complete(executionId, success: success, output: output)
    }
  }
}
