import CoreMotion
import NitroModules

// air pressure behind One.Barometer, matching expo-sensors' Barometer:
// CMAltimeter, kilopascals converted to hectopascals, relative altitude in
// meters, boot-relative seconds. the first listener starts the altimeter,
// so the first event can never race the subscription. setUpdateInterval is
// accepted and ignored, matching expo: the altimeter has no interval api.
// calls arrive on the js thread and hop to main, where all state lives.
final class HybridOneBarometer: HybridOneBarometerSpec {
  private let lock = NSLock()
  private var listeners: [Int: (BarometerMeasurement) -> Void] = [:]
  private var nextListenerId = 0
  private let altimeter = CMAltimeter()
  private let queue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "one.barometer"
    queue.maxConcurrentOperationCount = 1
    return queue
  }()
  private var observing = false

  deinit {
    altimeter.stopRelativeAltitudeUpdates()
  }

  func isAvailable() throws -> Bool {
    if Thread.isMainThread {
      return CMAltimeter.isRelativeAltitudeAvailable()
    }
    return DispatchQueue.main.sync {
      CMAltimeter.isRelativeAltitudeAvailable()
    }
  }

  func setUpdateInterval(intervalMs: Double) throws {
    // the altimeter delivers at its own rate; expo ignores this too.
  }

  func addListener(
    listener: @escaping (BarometerMeasurement) -> Void
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

  // main thread only. the first listener starts the altimeter; without
  // hardware the listeners stay registered and never fire, matching expo.
  private func ensureObserving() {
    guard !observing, CMAltimeter.isRelativeAltitudeAvailable() else { return }
    observing = true
    if CMAltimeter.authorizationStatus() == .notDetermined {
      if #available(iOS 17.4, *) {
        // ios 17.4 does not display the motion prompt for the altimeter
        // alone; a short accelerometer recording triggers it (expo parity).
        CMSensorRecorder().recordAccelerometer(forDuration: 0.1)
      }
    }
    altimeter.startRelativeAltitudeUpdates(to: queue) { [weak self] data, _ in
      guard let data else { return }
      let event = BarometerMeasurement(
        pressure: data.pressure.doubleValue * 10.0,
        relativeAltitude: data.relativeAltitude.doubleValue,
        timestamp: data.timestamp)
      DispatchQueue.main.async {
        self?.emit(event)
      }
    }
  }

  private func emit(_ event: BarometerMeasurement) {
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
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
      if remaining == 0, self.observing {
        self.observing = false
        self.altimeter.stopRelativeAltitudeUpdates()
      }
    }
  }
}
