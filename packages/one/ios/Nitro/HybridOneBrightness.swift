import NitroModules
import UIKit

// screen brightness behind One.Brightness, matching expo-brightness: the
// app brightness reads and writes UIScreen.main, which persists until the
// device locks. ios exposes no system brightness api, so the system members
// answer with the app value or the matching empty value, and no permission
// is ever needed. calls arrive on the js thread and hop to main, where all
// state lives; the brightness notification posts on main too.
final class HybridOneBrightness: HybridOneBrightnessSpec {
  private let lock = NSLock()
  private var listeners: [Int: (BrightnessEvent) -> Void] = [:]
  private var nextListenerId = 0
  private var observer: NSObjectProtocol?
  private var lastBrightness: Double?

  func get() throws -> Promise<Double> {
    let promise = Promise<Double>()
    DispatchQueue.main.async {
      promise.resolve(withResult: Double(UIScreen.main.brightness))
    }
    return promise
  }

  func set(value: Double) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      UIScreen.main.brightness = CGFloat(value)
      promise.resolve(withResult: ())
    }
    return promise
  }

  // ios has no system brightness separate from the app brightness.
  func getSystem() throws -> Promise<Double> {
    return try get()
  }

  func setSystem(value: Double) throws -> Promise<Void> {
    return Promise.resolved(withResult: ())
  }

  func getSystemMode() throws -> Promise<BrightnessMode> {
    return Promise.resolved(withResult: BrightnessMode.unknown)
  }

  func setSystemMode(mode: BrightnessMode) throws -> Promise<Void> {
    return Promise.resolved(withResult: ())
  }

  func isUsingSystem() throws -> Promise<Bool> {
    return Promise.resolved(withResult: true)
  }

  func restoreSystem() throws -> Promise<Void> {
    return Promise.resolved(withResult: ())
  }

  func getPermissions() throws -> Promise<BrightnessPermissionResponse> {
    return Promise.resolved(withResult: Self.granted())
  }

  func requestPermissions() throws -> Promise<BrightnessPermissionResponse> {
    return Promise.resolved(withResult: Self.granted())
  }

  private static func granted() -> BrightnessPermissionResponse {
    return BrightnessPermissionResponse(status: .granted, granted: true, canAskAgain: false)
  }

  func isAvailable() throws -> Bool {
    return true
  }

  func addListener(listener: @escaping (BrightnessEvent) -> Void) throws -> () -> Void {
    lock.lock()
    let id = nextListenerId
    nextListenerId += 1
    listeners[id] = listener
    lock.unlock()
    DispatchQueue.main.async {
      if self.observer == nil {
        self.lastBrightness = Double(UIScreen.main.brightness)
        self.observer = NotificationCenter.default.addObserver(
          forName: UIScreen.brightnessDidChangeNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.brightnessChanged() }
      }
    }
    return { [weak self] in self?.removeListener(id) }
  }

  private func brightnessChanged() {
    let brightness = Double(UIScreen.main.brightness)
    guard brightness != lastBrightness else { return }
    lastBrightness = brightness
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
    let event = BrightnessEvent(brightness: brightness)
    for listener in current {
      listener(event)
    }
  }

  private func removeListener(_ id: Int) {
    DispatchQueue.main.async {
      self.lock.lock()
      self.listeners[id] = nil
      let remaining = self.listeners.count
      self.lock.unlock()
      if remaining == 0, let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }
}
