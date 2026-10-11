import NitroModules
import UIKit

// battery level, state and low power mode behind One.Battery, matching
// expo-battery's values: UIDevice for level and state, ProcessInfo for low
// power mode. battery monitoring runs while any listener is attached; a
// one-shot read enables it only for the read. calls arrive on the js thread
// and hop to main, where all state lives; notifications post on main too.
final class HybridOneBattery: HybridOneBatterySpec {
  private let lock = NSLock()
  private var levelListeners: [Int: (BatteryLevelEvent) -> Void] = [:]
  private var stateListeners: [Int: (BatteryStateEvent) -> Void] = [:]
  private var lowPowerListeners: [Int: (BatteryPowerModeEvent) -> Void] = [:]
  private var nextListenerId = 0
  private var observers: [NSObjectProtocol] = []
  private var lastLevel: Double?
  private var lastState: BatteryState?
  private var lastLowPower: Bool?

  private static func mappedState(_ state: UIDevice.BatteryState) -> BatteryState {
    switch state {
    case .unplugged: return .unplugged
    case .charging: return .charging
    case .full: return .full
    case .unknown: return .unknown
    @unknown default: return .unknown
    }
  }

  // monitoring must be on for level and state to read anything but unknown.
  // one-shots leave it as they found it unless a listener needs it on. main
  // thread only.
  private func read<T>(_ body: () -> T) -> T {
    let device = UIDevice.current
    let wasMonitoring = device.isBatteryMonitoringEnabled
    if !wasMonitoring {
      device.isBatteryMonitoringEnabled = true
    }
    let result = body()
    lock.lock()
    let listening = !levelListeners.isEmpty || !stateListeners.isEmpty
    lock.unlock()
    if !wasMonitoring && !listening {
      device.isBatteryMonitoringEnabled = false
    }
    return result
  }

  func getLevel() throws -> Promise<Double> {
    let promise = Promise<Double>()
    DispatchQueue.main.async {
      promise.resolve(withResult: self.read { Double(UIDevice.current.batteryLevel) })
    }
    return promise
  }

  func getState() throws -> Promise<BatteryState> {
    let promise = Promise<BatteryState>()
    DispatchQueue.main.async {
      promise.resolve(
        withResult: self.read { Self.mappedState(UIDevice.current.batteryState) })
    }
    return promise
  }

  func getPowerState() throws -> Promise<BatteryPowerState> {
    let promise = Promise<BatteryPowerState>()
    DispatchQueue.main.async {
      let power = self.read {
        BatteryPowerState(
          batteryLevel: Double(UIDevice.current.batteryLevel),
          batteryState: Self.mappedState(UIDevice.current.batteryState),
          lowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled)
      }
      promise.resolve(withResult: power)
    }
    return promise
  }

  func isLowPowerModeEnabled() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: ProcessInfo.processInfo.isLowPowerModeEnabled)
    }
    return promise
  }

  // expo reports the api unavailable on simulators, where the level reads -1.
  func isAvailable() throws -> Bool {
    if Thread.isMainThread {
      return read { UIDevice.current.batteryLevel >= 0 }
    }
    return DispatchQueue.main.sync {
      self.read { UIDevice.current.batteryLevel >= 0 }
    }
  }

  func addLevelListener(listener: @escaping (BatteryLevelEvent) -> Void) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    levelListeners[id] = listener
    lock.unlock()
    DispatchQueue.main.async {
      self.ensureObserving()
      self.lastLevel = self.read { Double(UIDevice.current.batteryLevel) }
    }
    return { [weak self] in self?.removeListener(kind: .level, id: id) }
  }

  func addStateListener(listener: @escaping (BatteryStateEvent) -> Void) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    stateListeners[id] = listener
    lock.unlock()
    DispatchQueue.main.async {
      self.ensureObserving()
      self.lastState = self.read { Self.mappedState(UIDevice.current.batteryState) }
    }
    return { [weak self] in self?.removeListener(kind: .state, id: id) }
  }

  func addLowPowerModeListener(
    listener: @escaping (BatteryPowerModeEvent) -> Void
  ) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    lowPowerListeners[id] = listener
    lock.unlock()
    DispatchQueue.main.async {
      self.ensureObserving()
      self.lastLowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
    }
    return { [weak self] in self?.removeListener(kind: .lowPower, id: id) }
  }

  private enum ListenerKind {
    case level, state, lowPower
  }

  // main thread only. the first listener starts monitoring and the
  // notifications; the last removal stops them.
  private func ensureObserving() {
    guard observers.isEmpty else { return }
    UIDevice.current.isBatteryMonitoringEnabled = true
    let center = NotificationCenter.default
    observers = [
      center.addObserver(
        forName: UIDevice.batteryLevelDidChangeNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.levelChanged() },
      center.addObserver(
        forName: UIDevice.batteryStateDidChangeNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.stateChanged() },
      center.addObserver(
        forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: .main
      ) { [weak self] _ in self?.lowPowerChanged() },
    ]
  }

  private func levelChanged() {
    let level = Double(UIDevice.current.batteryLevel)
    guard level != lastLevel else { return }
    lastLevel = level
    emit(levelListeners, BatteryLevelEvent(batteryLevel: level))
  }

  private func stateChanged() {
    let state = Self.mappedState(UIDevice.current.batteryState)
    guard state != lastState else { return }
    lastState = state
    emit(stateListeners, BatteryStateEvent(batteryState: state))
  }

  private func lowPowerChanged() {
    let lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
    guard lowPower != lastLowPower else { return }
    lastLowPower = lowPower
    emit(lowPowerListeners, BatteryPowerModeEvent(lowPowerMode: lowPower))
  }

  private func emit<T>(_ listeners: [Int: (T) -> Void], _ event: T) {
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
    for listener in current {
      listener(event)
    }
  }

  private func removeListener(kind: ListenerKind, id: Int) {
    DispatchQueue.main.async {
      self.lock.lock()
      switch kind {
      case .level: self.levelListeners[id] = nil
      case .state: self.stateListeners[id] = nil
      case .lowPower: self.lowPowerListeners[id] = nil
      }
      let remaining =
        self.levelListeners.count + self.stateListeners.count + self.lowPowerListeners.count
      self.lock.unlock()
      if remaining == 0 {
        for observer in self.observers {
          NotificationCenter.default.removeObserver(observer)
        }
        self.observers = []
        UIDevice.current.isBatteryMonitoringEnabled = false
      }
    }
  }
}
