import BackgroundTasks
import Foundation
import NitroModules

@objc(OneBackgroundTasksCoordinator)
public final class OneBackgroundTasksCoordinator: NSObject {
  @objc public static let shared = OneBackgroundTasksCoordinator()

  private struct RunningTask {
    let task: BGTask?
    let identifier: String
    let kind: BackgroundTaskKind
  }

  private var registered = false
  private var startHost: (() -> Void)?
  private var onLaunch: ((BackgroundTaskInvocation) -> Void)?
  private var onExpire: ((String) -> Void)?
  private var listenerId: UUID?
  private var running: [String: RunningTask] = [:]

  private override init() {}

  private var refreshIds: [String] {
    Bundle.main.object(forInfoDictionaryKey: "OneBackgroundRefreshTaskIdentifiers") as? [String] ?? []
  }

  private var processingIds: [String] {
    Bundle.main.object(forInfoDictionaryKey: "OneBackgroundProcessingTaskIdentifiers") as? [String] ?? []
  }

  @objc(registerWithStartHost:)
  public func register(startHost: @escaping () -> Void) {
    precondition(Thread.isMainThread)
    self.startHost = startHost
    guard !registered else { return }
    registered = true
    for identifier in refreshIds + processingIds {
      let didRegister = BGTaskScheduler.shared.register(forTaskWithIdentifier: identifier, using: .main) { [weak self] task in
        self?.launch(task: task)
      }
      precondition(didRegister, "BackgroundTasks: \(identifier) is not in BGTaskSchedulerPermittedIdentifiers")
    }
  }

  fileprivate func kind(for identifier: String) -> BackgroundTaskKind? {
    if refreshIds.contains(identifier) { return .refresh }
    if processingIds.contains(identifier) { return .processing }
    return nil
  }

  fileprivate func listen(
    onLaunch: @escaping (BackgroundTaskInvocation) -> Void,
    onExpire: @escaping (String) -> Void
  ) -> () -> Void {
    precondition(Thread.isMainThread)
    let id = UUID()
    listenerId = id
    self.onLaunch = onLaunch
    self.onExpire = onExpire
    for (executionId, invocation) in running {
      onLaunch(BackgroundTaskInvocation(executionId: executionId,
        identifier: invocation.identifier, kind: invocation.kind))
    }
    return { [weak self] in
      DispatchQueue.main.async {
        guard self?.listenerId == id else { return }
        self?.listenerId = nil
        self?.onLaunch = nil
        self?.onExpire = nil
      }
    }
  }

  private func launch(task: BGTask) {
    precondition(Thread.isMainThread)
    guard let kind = kind(for: task.identifier) else {
      task.setTaskCompleted(success: false)
      return
    }
    let executionId = UUID().uuidString
    task.expirationHandler = { [weak self] in
      DispatchQueue.main.async { self?.expire(executionId) }
    }
    running[executionId] = RunningTask(task: task, identifier: task.identifier, kind: kind)
    startHost?()
    onLaunch?(BackgroundTaskInvocation(executionId: executionId,
      identifier: task.identifier, kind: kind))
    DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
      guard let self, self.running[executionId] != nil, self.onLaunch == nil else { return }
      self.complete(executionId, success: false)
    }
  }

  private func expire(_ executionId: String) {
    precondition(Thread.isMainThread)
    guard let runningTask = running.removeValue(forKey: executionId) else { return }
    onExpire?(executionId)
    runningTask.task?.setTaskCompleted(success: false)
    #if DEBUG
    if runningTask.task == nil {
      UserDefaults.standard.set("\(runningTask.identifier):false", forKey: "OneBackgroundTaskProof")
      UserDefaults.standard.synchronize()
    }
    #endif
  }

  fileprivate func complete(_ executionId: String, success: Bool) {
    precondition(Thread.isMainThread)
    guard let runningTask = running.removeValue(forKey: executionId) else { return }
    runningTask.task?.setTaskCompleted(success: success)
    #if DEBUG
    if runningTask.task == nil {
      UserDefaults.standard.set("\(runningTask.identifier):\(success)", forKey: "OneBackgroundTaskProof")
      UserDefaults.standard.synchronize()
    }
    #endif
  }

  #if DEBUG
  @objc(simulateLaunchWithIdentifier:)
  public func simulateLaunch(identifier: String) {
    precondition(Thread.isMainThread)
    guard let kind = kind(for: identifier) else { return }
    let executionId = UUID().uuidString
    running[executionId] = RunningTask(task: nil, identifier: identifier, kind: kind)
    startHost?()
    onLaunch?(BackgroundTaskInvocation(executionId: executionId,
      identifier: identifier, kind: kind))
  }

  @objc public func simulateExpiration() {
    precondition(Thread.isMainThread)
    guard let executionId = running.keys.first else { return }
    expire(executionId)
  }
  #endif
}

final class HybridOneBackgroundTasks: HybridOneBackgroundTasksSpec {
  func submit(
    identifier: String,
    earliestBeginDateMs: Double?,
    requiresNetworkConnectivity: Bool?,
    requiresExternalPower: Bool?
  ) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.global(qos: .utility).async {
      guard let kind = OneBackgroundTasksCoordinator.shared.kind(for: identifier) else {
        promise.reject(withError: oneNativeError("E_BACKGROUND_TASK_INPUT", "BackgroundTasks.submit: identifier is not configured"))
        return
      }
      guard earliestBeginDateMs == nil || (earliestBeginDateMs!.isFinite && earliestBeginDateMs! >= 0) else {
        promise.reject(withError: oneNativeError("E_BACKGROUND_TASK_INPUT", "BackgroundTasks.submit: invalid earliestBeginDateMs"))
        return
      }
      let request: BGTaskRequest
      switch kind {
      case .refresh:
        guard requiresNetworkConnectivity != true, requiresExternalPower != true else {
          promise.reject(withError: oneNativeError("E_BACKGROUND_TASK_INPUT", "BackgroundTasks.submit: refresh does not support processing requirements"))
          return
        }
        request = BGAppRefreshTaskRequest(identifier: identifier)
      case .processing:
        let processing = BGProcessingTaskRequest(identifier: identifier)
        processing.requiresNetworkConnectivity = requiresNetworkConnectivity ?? false
        processing.requiresExternalPower = requiresExternalPower ?? false
        request = processing
      }
      if let earliestBeginDateMs {
        request.earliestBeginDate = Date(timeIntervalSince1970: earliestBeginDateMs / 1000)
      }
      do {
        try BGTaskScheduler.shared.submit(request)
        promise.resolve(withResult: ())
      } catch {
        promise.reject(withError: oneNativeError("E_BACKGROUND_TASK_SUBMIT", "BackgroundTasks.submit: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func getPending() throws -> Promise<[PendingBackgroundTask]> {
    let promise = Promise<[PendingBackgroundTask]>()
    BGTaskScheduler.shared.getPendingTaskRequests { requests in
      let pending = requests.compactMap { request -> PendingBackgroundTask? in
        guard let kind = OneBackgroundTasksCoordinator.shared.kind(for: request.identifier) else { return nil }
        let processing = request as? BGProcessingTaskRequest
        return PendingBackgroundTask(
          identifier: request.identifier,
          kind: kind,
          earliestBeginDateMs: request.earliestBeginDate.map { $0.timeIntervalSince1970 * 1000 },
          requiresNetworkConnectivity: processing?.requiresNetworkConnectivity ?? false,
          requiresExternalPower: processing?.requiresExternalPower ?? false)
      }
      promise.resolve(withResult: pending)
    }
    return promise
  }

  func cancel(identifier: String) throws {
    guard OneBackgroundTasksCoordinator.shared.kind(for: identifier) != nil else {
      throw oneNativeError("E_BACKGROUND_TASK_INPUT", "BackgroundTasks.cancel: identifier is not configured")
    }
    BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: identifier)
  }

  func addTaskListener(
    onLaunch: @escaping (BackgroundTaskInvocation) -> Void,
    onExpire: @escaping (String) -> Void
  ) throws -> () -> Void {
    if Thread.isMainThread {
      return OneBackgroundTasksCoordinator.shared.listen(onLaunch: onLaunch, onExpire: onExpire)
    }
    return DispatchQueue.main.sync {
      OneBackgroundTasksCoordinator.shared.listen(onLaunch: onLaunch, onExpire: onExpire)
    }
  }

  func complete(executionId: String, success: Bool) throws {
    DispatchQueue.main.async {
      OneBackgroundTasksCoordinator.shared.complete(executionId, success: success)
    }
  }
}
