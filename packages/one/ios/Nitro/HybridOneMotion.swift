import CoreMotion
import NitroModules

final class HybridOneMotion: HybridOneMotionSpec {
  private struct Listener {
    let sensor: MotionSensor
    let intervalMs: Double
    let onReading: (MotionReading) -> Void
    let onError: (String, String) -> Void
    var lastTimestamp: Double?
  }

  private let manager = CMMotionManager()
  private let queue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "one.motion"
    queue.maxConcurrentOperationCount = 1
    return queue
  }()
  private var listeners: [UUID: Listener] = [:]

  deinit {
    manager.stopAccelerometerUpdates()
    manager.stopGyroUpdates()
    manager.stopMagnetometerUpdates()
    manager.stopDeviceMotionUpdates()
  }

  func getAvailability() throws -> MotionAvailability {
    if Thread.isMainThread { return availability() }
    return DispatchQueue.main.sync { availability() }
  }

  func addListener(
    sensor: MotionSensor,
    intervalMs: Double,
    onReading: @escaping (MotionReading) -> Void,
    onError: @escaping (String, String) -> Void
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      guard intervalMs.isFinite, intervalMs >= 0, intervalMs <= 1000 else {
        onError("E_MOTION_INPUT", "Motion.addListener: intervalMs must be between 0 and 1000")
        return
      }
      guard self.isAvailable(sensor) else {
        onError("E_MOTION_UNAVAILABLE", "Motion.addListener: \(sensor) is unavailable on this device")
        return
      }
      self.listeners[id] = Listener(
        sensor: sensor, intervalMs: intervalMs, onReading: onReading,
        onError: onError, lastTimestamp: nil)
      self.update(sensor)
    }
    return { [weak self] in
      DispatchQueue.main.async {
        guard let self, let listener = self.listeners.removeValue(forKey: id) else { return }
        self.update(listener.sensor)
      }
    }
  }

  private func availability() -> MotionAvailability {
    MotionAvailability(
      accelerometer: manager.isAccelerometerAvailable,
      gyroscope: manager.isGyroAvailable,
      magnetometer: manager.isMagnetometerAvailable,
      deviceMotion: manager.isDeviceMotionAvailable)
  }

  private func isAvailable(_ sensor: MotionSensor) -> Bool {
    switch sensor {
    case .accelerometer: return manager.isAccelerometerAvailable
    case .gyroscope: return manager.isGyroAvailable
    case .magnetometer: return manager.isMagnetometerAvailable
    case .devicemotion: return manager.isDeviceMotionAvailable
    }
  }

  private func update(_ sensor: MotionSensor) {
    let intervals = listeners.values.filter { $0.sensor == sensor }.map(\.intervalMs)
    guard let fastest = intervals.min() else {
      switch sensor {
      case .accelerometer: manager.stopAccelerometerUpdates()
      case .gyroscope: manager.stopGyroUpdates()
      case .magnetometer: manager.stopMagnetometerUpdates()
      case .devicemotion: manager.stopDeviceMotionUpdates()
      }
      return
    }
    let interval = fastest == 0 ? 0.001 : fastest / 1000
    switch sensor {
    case .accelerometer:
      manager.accelerometerUpdateInterval = interval
      guard !manager.isAccelerometerActive else { return }
      manager.startAccelerometerUpdates(to: queue) { [weak self] data, error in
        self?.receive(sensor, timestamp: data?.timestamp, error: error) { timestampMs in
          guard let data else { return nil }
          return MotionReading(sensor: sensor, timestampMs: timestampMs,
            value: MotionVector(x: data.acceleration.x, y: data.acceleration.y, z: data.acceleration.z),
            gravity: nil, userAcceleration: nil, rotationRate: nil, attitude: nil)
        }
      }
    case .gyroscope:
      manager.gyroUpdateInterval = interval
      guard !manager.isGyroActive else { return }
      manager.startGyroUpdates(to: queue) { [weak self] data, error in
        self?.receive(sensor, timestamp: data?.timestamp, error: error) { timestampMs in
          guard let data else { return nil }
          return MotionReading(sensor: sensor, timestampMs: timestampMs,
            value: MotionVector(x: data.rotationRate.x, y: data.rotationRate.y, z: data.rotationRate.z),
            gravity: nil, userAcceleration: nil, rotationRate: nil, attitude: nil)
        }
      }
    case .magnetometer:
      manager.magnetometerUpdateInterval = interval
      guard !manager.isMagnetometerActive else { return }
      manager.startMagnetometerUpdates(to: queue) { [weak self] data, error in
        self?.receive(sensor, timestamp: data?.timestamp, error: error) { timestampMs in
          guard let data else { return nil }
          return MotionReading(sensor: sensor, timestampMs: timestampMs,
            value: MotionVector(x: data.magneticField.x, y: data.magneticField.y, z: data.magneticField.z),
            gravity: nil, userAcceleration: nil, rotationRate: nil, attitude: nil)
        }
      }
    case .devicemotion:
      manager.deviceMotionUpdateInterval = interval
      guard !manager.isDeviceMotionActive else { return }
      manager.startDeviceMotionUpdates(to: queue) { [weak self] data, error in
        self?.receive(sensor, timestamp: data?.timestamp, error: error) { timestampMs in
          guard let data else { return nil }
          let acceleration = data.userAcceleration
          let gravity = data.gravity
          let rotation = data.rotationRate
          let attitude = data.attitude
          let value = MotionVector(x: acceleration.x, y: acceleration.y, z: acceleration.z)
          return MotionReading(sensor: sensor, timestampMs: timestampMs, value: value,
            gravity: MotionVector(x: gravity.x, y: gravity.y, z: gravity.z),
            userAcceleration: value,
            rotationRate: MotionVector(x: rotation.x, y: rotation.y, z: rotation.z),
            attitude: MotionVector(x: attitude.roll, y: attitude.pitch, z: attitude.yaw))
        }
      }
    }
  }

  private func receive(
    _ sensor: MotionSensor,
    timestamp: TimeInterval?,
    error: Error?,
    reading: @escaping (Double) -> MotionReading?
  ) {
    DispatchQueue.main.async {
      if let error {
        let affected = self.listeners.filter { $0.value.sensor == sensor }
        for (id, listener) in affected {
          self.listeners.removeValue(forKey: id)
          listener.onError("E_MOTION_STREAM", "Motion.addListener: \(error.localizedDescription)")
        }
        self.update(sensor)
        return
      }
      guard let timestamp else { return }
      let timestampMs = (Date().timeIntervalSince1970 - ProcessInfo.processInfo.systemUptime + timestamp) * 1000
      guard let sample = reading(timestampMs) else { return }
      let ids = self.listeners.compactMap { $0.value.sensor == sensor ? $0.key : nil }
      for id in ids {
        guard var listener = self.listeners[id] else { continue }
        if let last = listener.lastTimestamp, timestampMs - last < listener.intervalMs - 1 { continue }
        listener.lastTimestamp = timestampMs
        self.listeners[id] = listener
        listener.onReading(sample)
      }
    }
  }
}
