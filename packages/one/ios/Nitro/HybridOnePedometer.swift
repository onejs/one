import CoreMotion
import NitroModules

// step counting behind One.Pedometer, matching expo-sensors' Pedometer:
// CMPedometer for live steps since the watch started and the seven-day
// history query. the first watch starts updates, so the first event can
// never race the subscription. permissions read the CoreMotion
// authorization status; requesting starts updates to show the system
// prompt. calls arrive on the js thread and hop to main, where all state
// lives.
final class HybridOnePedometer: HybridOnePedometerSpec {
  private let lock = NSLock()
  private var listeners: [Int: (PedometerResult) -> Void] = [:]
  private var nextListenerId = 0
  private lazy var pedometer = CMPedometer()
  private var observing = false

  func isAvailable() throws -> Bool {
    if Thread.isMainThread {
      return CMPedometer.isStepCountingAvailable()
    }
    return DispatchQueue.main.sync {
      CMPedometer.isStepCountingAvailable()
    }
  }

  func watchStepCount(
    listener: @escaping (PedometerResult) -> Void
  ) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    listeners[id] = listener
    lock.unlock()
    DispatchQueue.main.async {
      self.ensureObserving()
    }
    return { [weak self] in self?.removeListener(id) }
  }

  func getStepCount(startMs: Double, endMs: Double) throws -> Promise<PedometerResult> {
    let promise = Promise<PedometerResult>()
    guard startMs.isFinite, endMs.isFinite, startMs <= endMs else {
      promise.reject(
        withError: oneNativeError(
          "E_PEDOMETER_STEP_COUNT", "Pedometer.getStepCount: start must precede end"))
      return promise
    }
    DispatchQueue.main.async {
      let start = Date(timeIntervalSince1970: startMs / 1000)
      let end = Date(timeIntervalSince1970: endMs / 1000)
      self.pedometer.queryPedometerData(from: start, to: end) { data, error in
        DispatchQueue.main.async {
          if let error {
            promise.reject(
              withError: oneNativeError(
                "E_PEDOMETER_STEP_COUNT",
                "Pedometer.getStepCount: \(error.localizedDescription)"))
          } else {
            promise.resolve(
              withResult: PedometerResult(steps: data?.numberOfSteps.doubleValue ?? 0))
          }
        }
      }
    }
    return promise
  }

  func getPermissions() throws -> Promise<PedometerPermissionResponse> {
    let promise = Promise<PedometerPermissionResponse>()
    DispatchQueue.main.async {
      promise.resolve(withResult: Self.response(for: CMPedometer.authorizationStatus()))
    }
    return promise
  }

  func requestPermissions() throws -> Promise<PedometerPermissionResponse> {
    let promise = Promise<PedometerPermissionResponse>()
    DispatchQueue.main.async {
      let current = CMPedometer.authorizationStatus()
      guard current == .notDetermined else {
        promise.resolve(withResult: Self.response(for: current))
        return
      }
      guard CMPedometer.isStepCountingAvailable() else {
        promise.resolve(withResult: Self.response(for: current))
        return
      }
      // CoreMotion has no explicit request call: starting updates shows
      // the prompt. probe on an isolated pedometer, so stopping the probe
      // can never stop a live watch on the shared one, even when the probe
      // callback lands after the watch starts.
      let probe: CMPedometer? = self.observing ? nil : CMPedometer()
      if let probe {
        probe.startUpdates(from: Date()) { [weak probe] _, _ in
          probe?.stopUpdates()
        }
      }
      self.awaitDetermined(
        promise: promise, probe: probe, deadline: Date().addingTimeInterval(60))
    }
    return promise
  }

  // main thread only. resolves once the user answers the prompt, or with
  // the current status after the deadline.
  private func awaitDetermined(
    promise: Promise<PedometerPermissionResponse>, probe: CMPedometer?, deadline: Date
  ) {
    let status = CMPedometer.authorizationStatus()
    guard status == .notDetermined, Date() < deadline else {
      probe?.stopUpdates()
      promise.resolve(withResult: Self.response(for: status))
      return
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
      self?.awaitDetermined(promise: promise, probe: probe, deadline: deadline)
    }
  }

  private static func response(for status: CMAuthorizationStatus) -> PedometerPermissionResponse {
    switch status {
    case .authorized:
      return PedometerPermissionResponse(status: .granted, granted: true, canAskAgain: false)
    case .denied, .restricted:
      return PedometerPermissionResponse(status: .denied, granted: false, canAskAgain: false)
    case .notDetermined:
      return PedometerPermissionResponse(
        status: .undetermined, granted: false, canAskAgain: true)
    @unknown default:
      return PedometerPermissionResponse(
        status: .undetermined, granted: false, canAskAgain: true)
    }
  }

  // main thread only. the first watch starts updates; without hardware
  // the watches stay registered and never fire, matching expo.
  private func ensureObserving() {
    guard !observing, CMPedometer.isStepCountingAvailable() else { return }
    observing = true
    pedometer.startUpdates(from: Date()) { [weak self] data, _ in
      guard let data else { return }
      let result = PedometerResult(steps: data.numberOfSteps.doubleValue)
      DispatchQueue.main.async {
        self?.emit(result)
      }
    }
  }

  private func emit(_ result: PedometerResult) {
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
    for listener in current {
      listener(result)
    }
  }

  private func removeListener(_ id: Int) {
    DispatchQueue.main.async {
      self.lock.lock()
      self.listeners[id] = nil
      let remaining = self.listeners.count
      self.lock.unlock()
      if remaining == 0, self.observing {
        self.observing = false
        self.pedometer.stopUpdates()
      }
    }
  }
}
